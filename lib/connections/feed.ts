import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 3;

export class FeedError extends Error {}

/** Normalize a pasted feed link: webcal:// becomes https://, http is upgraded. */
export function normalizeFeedUrl(raw: string): URL {
  let value = raw.trim();
  if (/^webcals?:\/\//i.test(value)) value = value.replace(/^webcals?:\/\//i, "https://");
  if (/^http:\/\//i.test(value)) value = value.replace(/^http:\/\//i, "https://");
  if (!/^https:\/\//i.test(value)) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new FeedError("That doesn’t look like a calendar link.");
  }
  if (url.username || url.password || (url.port && url.port !== "443")) throw new FeedError("That link isn’t supported.");
  return url;
}

function isPrivate(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivate(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb") || v6.startsWith("ff");
}

/**
 * DNS lookup for the connection itself: resolves the host and refuses
 * private, loopback or link-local addresses. Checking inside the socket's own
 * lookup means the address that was checked is the address that is used.
 */
const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as unknown as LookupAddress[];
    if (!list.length || list.some((a) => isPrivate(a.address))) {
      return callback(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }), "", 4);
    }
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

type Raw = { status: number; location: string | null; body: string };

function get(url: URL): Promise<Raw> {
  if (url.protocol !== "https:") return Promise.reject(new FeedError("Only secure (https) calendar links are supported."));
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isPrivate(host)) return Promise.reject(new FeedError("That link isn’t supported."));
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        lookup: publicLookup,
        timeout: 8000,
        headers: { accept: "text/calendar, text/plain;q=0.9, */*;q=0.1", "user-agent": "Forma calendar reader" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location ?? null, body: "" });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            reject(new FeedError("That calendar is too large to read."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, location: null, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", () => reject(new FeedError("The calendar couldn’t be read.")));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e: NodeJS.ErrnoException) =>
      reject(e instanceof FeedError ? e : new FeedError(e.code === "EBLOCKED" ? "That link isn’t supported." : "Couldn’t reach that calendar link.")),
    );
    req.end();
  });
}

/** Download a calendar feed safely and return its text. */
export async function fetchFeed(raw: string): Promise<string> {
  let url = normalizeFeedUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await get(url);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) break;
      url = new URL(res.location, url);
      continue;
    }
    if (res.status < 200 || res.status >= 300) {
      throw new FeedError(res.status === 404 ? "That calendar link wasn’t found." : "The calendar couldn’t be read.");
    }
    if (!res.body.includes("BEGIN:VCALENDAR")) throw new FeedError("That link isn’t a calendar feed. Look for an iCal or ICS link.");
    return res.body;
  }
  throw new FeedError("That calendar link redirects too many times.");
}

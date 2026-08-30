import { channelAllows, conversationChannelToken, parseChannel } from "@/domain/book-parse";

export class SalesChannelEligibilityService {
  static parse(raw?: string | null) {
    return parseChannel(raw);
  }

  static allows(offer: { channelExcludes: string[]; channelAllows: string[]; salesChannelRaw: string | null }, conversationChannel: string) {
    const rule = offer.salesChannelRaw
      ? parseChannel(offer.salesChannelRaw)
      : { allows: offer.channelAllows, excludes: offer.channelExcludes, raw: offer.salesChannelRaw ?? "" };
    return channelAllows(rule, conversationChannel);
  }

  static token(channel: string) {
    return conversationChannelToken(channel);
  }
}

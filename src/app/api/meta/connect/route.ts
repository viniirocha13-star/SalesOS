import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import {
  connectWithEmbeddedCode,
  connectWithManualToken,
} from "@/wa/meta-connection";

const schema = z.object({
  mode: z.enum(["embedded", "manual"]).default("manual"),
  code: z.string().optional(),
  accessToken: z.string().optional(),
  wabaId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  businessId: z.string().optional(),
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("meta.manage");
  const body = schema.parse(await readJson(request));

  if (body.mode === "embedded") {
    if (!body.code) throw badRequest("Código do Embedded Signup ausente.");
    const result = await connectWithEmbeddedCode({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      code: body.code,
      wabaId: body.wabaId,
      phoneNumberId: body.phoneNumberId,
      businessId: body.businessId,
    });
    return NextResponse.json({
      ok: true,
      message: `Meta conectada. ${result.wabas} WABA(s), ${result.phones} número(s), ${result.templates} template(s).`,
      result,
    });
  }

  if (!body.accessToken) throw badRequest("Informe o access token.");
  const result = await connectWithManualToken({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    accessToken: body.accessToken,
    wabaId: body.wabaId,
    businessId: body.businessId,
  });
  return NextResponse.json({
    ok: true,
    message: `Token salvo e sincronizado. ${result.phones} número(s), ${result.templates} template(s).`,
    result,
  });
});

import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { importContacts, parseCsvContacts } from "@/wa/contact-import";

const schema = z.object({
  csv: z.string().min(1),
  fileName: z.string().default("contatos.csv"),
  dryRun: z.boolean().default(true),
  consentConfirmed: z.boolean().default(false),
  listName: z.string().optional(),
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("contacts.import");
  const body = schema.parse(await readJson(request));
  const rows = parseCsvContacts(body.csv);
  if (!rows.length) throw badRequest("Nenhuma linha de contato encontrada no arquivo.");

  const result = await importContacts({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    rows,
    fileName: body.fileName,
    dryRun: body.dryRun,
    consentConfirmed: body.consentConfirmed,
    listName: body.listName,
  });

  return NextResponse.json({ ok: true, ...result });
});

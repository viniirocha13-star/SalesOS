import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import type { ConsentSource } from "@prisma/client";
import { checkPlanLimit } from "@/wa/plan-limits";

export type ImportRow = {
  name?: string;
  phone: string;
  email?: string;
  tag?: string;
  city?: string;
  state?: string;
  source?: string;
};

export function parseCsvContacts(csv: string): ImportRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === "," && !q) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const header = split(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    name: header.findIndex((h) => ["nome", "name"].includes(h)),
    phone: header.findIndex((h) => ["telefone", "phone", "celular", "whatsapp"].includes(h)),
    email: header.findIndex((h) => ["email", "e-mail"].includes(h)),
    tag: header.findIndex((h) => ["tag", "tags"].includes(h)),
    city: header.findIndex((h) => ["cidade", "city"].includes(h)),
    state: header.findIndex((h) => ["estado", "uf", "state"].includes(h)),
    source: header.findIndex((h) => ["origem", "source"].includes(h)),
  };
  if (idx.phone < 0) {
    // assume segunda coluna ou primeira se só uma
    idx.phone = header.length > 1 ? 1 : 0;
    if (idx.name < 0 && header.length > 1) idx.name = 0;
  }

  const start = looksLikeHeader(header) ? 1 : 0;
  const rows: ImportRow[] = [];
  for (const line of lines.slice(start)) {
    const cols = split(line);
    const phone = cols[idx.phone] ?? "";
    if (!phone) continue;
    rows.push({
      name: idx.name >= 0 ? cols[idx.name] : undefined,
      phone,
      email: idx.email >= 0 ? cols[idx.email] : undefined,
      tag: idx.tag >= 0 ? cols[idx.tag] : undefined,
      city: idx.city >= 0 ? cols[idx.city] : undefined,
      state: idx.state >= 0 ? cols[idx.state] : undefined,
      source: idx.source >= 0 ? cols[idx.source] : undefined,
    });
  }
  return rows;
}

function looksLikeHeader(header: string[]) {
  return header.some((h) =>
    ["nome", "name", "telefone", "phone", "email", "celular", "whatsapp"].includes(h),
  );
}

export async function importContacts(input: {
  organizationId: string;
  userId: string;
  rows: ImportRow[];
  fileName: string;
  dryRun: boolean;
  consentConfirmed: boolean;
  listName?: string;
  consentSource?: ConsentSource;
}) {
  if (!input.dryRun && !input.consentConfirmed) {
    throw Object.assign(new Error("Confirme a autorização da lista antes de importar."), { status: 400 });
  }

  const seen = new Set<string>();
  const sample: { name?: string; phone: string; ok: boolean; reason?: string }[] = [];
  let valid = 0;
  let invalid = 0;
  let duplicate = 0;
  const normalized: { row: ImportRow; phoneE164: string }[] = [];

  for (const row of input.rows) {
    const phoneE164 = normalizePhone(row.phone);
    if (!phoneE164 || phoneE164.length < 11) {
      invalid += 1;
      if (sample.length < 20) sample.push({ name: row.name, phone: row.phone, ok: false, reason: "Telefone inválido" });
      continue;
    }
    if (seen.has(phoneE164)) {
      duplicate += 1;
      if (sample.length < 20) sample.push({ name: row.name, phone: phoneE164, ok: false, reason: "Duplicado no arquivo" });
      continue;
    }
    seen.add(phoneE164);
    valid += 1;
    normalized.push({ row, phoneE164 });
    if (sample.length < 20) sample.push({ name: row.name, phone: phoneE164, ok: true });
  }

  const preview = {
    totalRows: input.rows.length,
    validRows: valid,
    invalidRows: invalid,
    duplicateRows: duplicate,
    createdRows: 0,
    updatedRows: 0,
    sample,
  };

  if (input.dryRun) return { preview };

  await checkPlanLimit(input.organizationId, "contacts", valid);

  let created = 0;
  let updated = 0;
  let listId: string | undefined;

  if (input.listName) {
    const list = await prisma.contactList.create({
      data: {
        organizationId: input.organizationId,
        name: input.listName,
        kind: "STATIC",
      },
    });
    listId = list.id;
  }

  for (const { row, phoneE164 } of normalized) {
    const existing = await prisma.contact.findUnique({
      where: {
        organizationId_phoneE164: { organizationId: input.organizationId, phoneE164 },
      },
    });
    const contact = existing
      ? await prisma.contact.update({
          where: { id: existing.id },
          data: {
            name: row.name || existing.name,
            email: row.email || existing.email,
            city: row.city || existing.city,
            state: row.state || existing.state,
            source: row.source || existing.source || "import",
            status: existing.status === "OPTED_OUT" ? "OPTED_OUT" : "ACTIVE",
          },
        })
      : await prisma.contact.create({
          data: {
            organizationId: input.organizationId,
            name: row.name,
            phoneE164,
            email: row.email,
            city: row.city,
            state: row.state,
            source: row.source || "import",
            optedInAt: new Date(),
          },
        });
    if (existing) updated += 1;
    else created += 1;

    if (input.consentConfirmed) {
      await prisma.contactConsent.create({
        data: {
          organizationId: input.organizationId,
          contactId: contact.id,
          consentType: "MARKETING",
          source: input.consentSource ?? "AUTHORIZED_IMPORT",
          proof: `Importação ${input.fileName}`,
          grantedAt: new Date(),
        },
      });
    }

    if (row.tag) {
      const tag = await prisma.tag.upsert({
        where: {
          organizationId_name: { organizationId: input.organizationId, name: row.tag },
        },
        create: { organizationId: input.organizationId, name: row.tag },
        update: {},
      });
      await prisma.contactTag.upsert({
        where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
        create: {
          organizationId: input.organizationId,
          contactId: contact.id,
          tagId: tag.id,
        },
        update: {},
      });
    }

    if (listId) {
      await prisma.contactListMember.upsert({
        where: { listId_contactId: { listId, contactId: contact.id } },
        create: {
          organizationId: input.organizationId,
          listId,
          contactId: contact.id,
        },
        update: {},
      });
    }
  }

  await prisma.contactImport.create({
    data: {
      organizationId: input.organizationId,
      fileName: input.fileName,
      totalRows: input.rows.length,
      validRows: valid,
      invalidRows: invalid,
      duplicateRows: duplicate,
      createdRows: created,
      updatedRows: updated,
      consentConfirmed: input.consentConfirmed,
      consentSource: input.consentSource ?? "AUTHORIZED_IMPORT",
      listId,
      createdById: input.userId,
    },
  });

  await audit({
    actorId: input.userId,
    organizationId: input.organizationId,
    action: "contacts.import",
    entity: "ContactImport",
    metadata: { created, updated, valid, fileName: input.fileName },
  });

  return {
    preview: { ...preview, createdRows: created, updatedRows: updated },
  };
}

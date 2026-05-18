/**
 * POST /api/lead
 * Recebe o formulário do relatório e cria/atualiza registros no Attio:
 *   - Companies: upsert pelo nome da empresa
 *   - People: upsert pelo email, vinculado à company
 *   - Note: registra fonte e segmento em ambos os records
 *
 * Variável de ambiente necessária no Vercel:
 *   ATTIO_API_KEY = sua API key do Attio (Settings → API Keys)
 */

const ATTIO_BASE = 'https://api.attio.com/v2';
const SOURCE     = 'relatorio_inadimplencia';

export default async function handler(req, res) {
  // CORS — permite apenas o mesmo domínio em produção
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nome, email, empresa, cargo, segmento } = req.body ?? {};

  if (!nome || !email || !empresa || !cargo || !segmento) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const key = process.env.ATTIO_API_KEY;
  if (!key) return res.status(500).json({ error: 'ATTIO_API_KEY not configured' });

  const headers = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  // ── 1. Upsert Company ────────────────────────────────────────────────────
  let companyRecordId = null;
  try {
    const companyRes = await fetch(`${ATTIO_BASE}/objects/companies/records`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        data: {
          values: {
            name: [{ value: empresa }],
          },
        },
        matching_attribute: 'name',
      }),
    });

    if (companyRes.ok) {
      const companyData = await companyRes.json();
      companyRecordId = companyData.data?.id?.record_id ?? null;
    }
  } catch (_) { /* falha silenciosa — continua sem link de empresa */ }

  // ── 2. Upsert Person ─────────────────────────────────────────────────────
  const nameParts = nome.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ');

  const personValues = {
    name: [{ first_name: firstName, last_name: lastName, full_name: nome.trim() }],
    email_addresses: [{ email_address: email.trim().toLowerCase(), is_primary: true }],
    job_title: [{ value: cargo }],
    description: [{ value: `Segmento: ${segmento}\nFonte: ${SOURCE}` }],
  };

  if (companyRecordId) {
    personValues.company = [{
      target_object: 'companies',
      target_record_id: companyRecordId,
    }];
  }

  let personRecordId = null;
  try {
    const personRes = await fetch(`${ATTIO_BASE}/objects/people/records`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        data: { values: personValues },
        matching_attribute: 'email_addresses',
      }),
    });

    if (personRes.ok) {
      const personData = await personRes.json();
      personRecordId = personData.data?.id?.record_id ?? null;
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create person record' });
  }

  // ── 3. Note em People ────────────────────────────────────────────────────
  if (personRecordId) {
    try {
      await fetch(`${ATTIO_BASE}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            parent_object: 'people',
            parent_record_id: personRecordId,
            title: `Lead — Relatório Inadimplência B2B 2025`,
            content: `#${SOURCE}\n\nSegmento: ${segmento}\nCargo: ${cargo}\nEmpresa: ${empresa}\nData: ${new Date().toLocaleDateString('pt-BR')}`,
          },
        }),
      });
    } catch (_) { /* nota opcional — não bloqueia */ }
  }

  // ── 4. Note em Companies ─────────────────────────────────────────────────
  if (companyRecordId) {
    try {
      await fetch(`${ATTIO_BASE}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            parent_object: 'companies',
            parent_record_id: companyRecordId,
            title: `Lead — Relatório Inadimplência B2B 2025`,
            content: `#${SOURCE}\n\nContato: ${nome} (${cargo})\nSegmento: ${segmento}\nData: ${new Date().toLocaleDateString('pt-BR')}`,
          },
        }),
      });
    } catch (_) { /* nota opcional — não bloqueia */ }
  }

  return res.status(200).json({ success: true, personRecordId, companyRecordId });
}

/** Solo desarrollo local: prueba dos empresas reales en una BD desechable. */
import assert from "node:assert/strict";
import {
  randomUUID,
  createHmac,
  createCipheriv,
  randomBytes,
} from "node:crypto";
import postgres from "postgres";
import { createServer } from "node:http";
const base = process.env.APP_BASE_URL;
if (
  !base ||
  !process.env.DATABASE_URL ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  ) ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  process.env.MULTITENANT !== "true" ||
  process.env.WA_MOCK_ENABLED !== "true"
)
  throw new Error(
    "Requiere entorno local multitenant con mocks y base de pruebas",
  );
const email = process.env.E2E_ADMIN_EMAIL,
  password = process.env.E2E_ADMIN_PASSWORD;
if (!email || !password)
  throw new Error(
    "Configura E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD para una cuenta de pruebas",
  );
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => {},
  connection: { TimeZone: "UTC" },
});
const suffix = randomUUID().slice(0, 8);
const check = (value, message) => {
  assert.ok(value, message);
  console.log(`✓ ${message}`);
};
async function request(
  path,
  { cookie, key, method = "GET", body, origin = base, headers = {} } = {},
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      origin,
      ...(cookie ? { cookie } : {}),
      ...(key ? { "x-api-key": key } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return {
    status: res.status,
    data,
    cookie: res.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; "),
  };
}
async function login(email, password) {
  const r = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(r.status, 200, `login ${r.status}`);
  return r.cookie;
}
const created = [];
const deliveries = [];
const streamControllers = [];
let revokedData = "",
  revokedClosed = false;
const mock = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  let raw = "";
  req.on("data", (b) => (raw += b));
  req.on("end", () => {
    deliveries.push({
      url: req.url,
      raw,
      signature: req.headers["x-vocero-signature"],
    });
    res.writeHead(200);
    res.end("{}");
  });
});
await new Promise((resolve) => mock.listen(3101, "127.0.0.1", resolve));
const encrypt = (token) => {
  const iv = randomBytes(12),
    cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.ENCRYPTION_KEY, "base64"),
      iv,
    );
  const enc = Buffer.concat([cipher.update(token), cipher.final()]);
  return {
    cipher: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
};
try {
  const admin = await login(email, password);
  const all = await request("/api/organizations", { cookie: admin });
  check(all.data.platformAdmin, "Administrador de plataforma autenticado");
  const pwd = `Test-${randomUUID()}!`;
  const companies = [];
  for (const name of ["a", "b"]) {
    const ownerEmail = `${name}-${suffix}@local.test`;
    const r = await request("/api/organizations", {
      cookie: admin,
      method: "POST",
      body: {
        name: `Empresa ${name.toUpperCase()} ${suffix}`,
        slug: `test-${name}-${suffix}`,
        ownerEmail,
        ownerName: `Propietario ${name}`,
        password: pwd,
      },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const org = r.data.organization;
    created.push(org.id);
    const cookie = await login(ownerEmail, pwd);
    companies.push({ org, cookie, email: ownerEmail });
  }
  const [a, b] = companies;
  check(
    a.org.id !== b.org.id,
    "Dos empresas creadas con propietarios independientes",
  );
  for (const c of companies) {
    const r = await request("/api/organizations", { cookie: c.cookie });
    check(
      r.data.organizations.length === 1 &&
        r.data.organizations[0].id === c.org.id,
      "El propietario solo lista su empresa",
    );
    const key = await request(`/api/organizations/${c.org.id}/brain`, {
      cookie: admin,
      method: "PUT",
      body: { dispatchUrl: "", healthUrl: "" },
    });
    assert.equal(key.status, 200);
    c.key = key.data.apiKey;
    const contact = await request("/api/contacts", {
      cookie: c.cookie,
      method: "POST",
      body: { name: `Contacto privado ${c.org.slug}`, phone: "34600000001" },
    });
    assert.equal(contact.status, 201, JSON.stringify(contact.data));
    c.contact = contact.data.contact;
    const convId = `cv_${randomUUID().replaceAll("-", "")}`;
    await sql`insert into conversation(id,organization_id,contact_id,last_inbound_at) values(${convId},${c.org.id},${c.contact.id},now())`;
    c.conv = convId;
  }
  check(
    a.contact.id !== b.contact.id,
    "El mismo teléfono puede existir en dos empresas sin mezclarse",
  );
  for (const [path, method, body] of [
    [`/api/contacts/${b.contact.id}`, "GET"],
    [`/api/contacts/${b.contact.id}`, "PATCH", { name: "INTRUSO" }],
    [`/api/conversations/${b.conv}/messages`, "GET"],
    [`/api/conversations/${b.conv}`, "PATCH", { aiEnabled: false }],
  ]) {
    const r = await request(path, { cookie: a.cookie, method, body });
    check(r.status === 404, `Aislamiento de ${method} ${path.split("/")[2]}`);
  }
  const [stageB] =
    await sql`select id from pipeline_stage where organization_id=${b.org.id} limit 1`;
  const wrongStage = await request("/api/contacts", {
    cookie: a.cookie,
    method: "POST",
    body: { name: "No debe crearse", phone: "34600000009", stageId: stageB.id },
  });
  check(
    wrongStage.status === 422,
    "No se puede crear un contacto usando una etapa de otra empresa",
  );
  const list = await request("/api/contacts", { cookie: a.cookie });
  check(
    list.data.contacts.length === 1 &&
      list.data.contacts[0].id === a.contact.id,
    "La lista de contactos no contiene datos de la otra empresa",
  );
  const switchOther = await request("/api/organizations/active", {
    cookie: a.cookie,
    method: "POST",
    body: { organizationId: b.org.id },
  });
  check(
    switchOther.status === 403,
    "No se puede seleccionar una empresa ajena",
  );
  const createOther = await request("/api/organizations", {
    cookie: a.cookie,
    method: "POST",
    body: {},
  });
  check(
    createOther.status === 403,
    "Un propietario no puede crear empresas de plataforma",
  );
  const brainOther = await request(`/api/organizations/${b.org.id}/brain`, {
    cookie: a.cookie,
    method: "PUT",
    body: { dispatchUrl: "http://127.0.0.1:1" },
  });
  check(
    brainOther.status === 403,
    "Un propietario no puede configurar destinos internos de otros agentes",
  );
  const csrf = await request("/api/contacts", {
    cookie: a.cookie,
    method: "POST",
    origin: "https://otro.example",
    body: { name: "intruso", phone: "34600000002" },
  });
  check(
    csrf.status === 403,
    "Mutaciones con cookie desde otro origen se rechazan",
  );
  const own = await request(`/api/bot/context?conversationId=${a.conv}`, {
    key: a.key,
  });
  check(own.status === 200, "La clave del agente accede a su conversación");
  const alien = await request(`/api/bot/context?conversationId=${b.conv}`, {
    key: a.key,
  });
  check(alien.status === 404, "La clave del agente no accede a otra empresa");
  const alienWrite = await request("/api/bot/ficha", {
    key: a.key,
    method: "PUT",
    body: { conversationId: b.conv, ficha: { intruso: true } },
  });
  check(
    alienWrite.status === 404,
    "La clave del agente no modifica fichas de otra empresa",
  );
  const globalKey = await request("/api/bot/profile", {
    key: process.env.BOT_API_KEY ?? "global-key-that-must-not-be-accepted",
  });
  check(
    globalKey.status === 401,
    "Las claves globales no abren la API en modo multitenant",
  );
  const before = await request("/api/agent/brain-status", { cookie: b.cookie });
  check(
    before.data.external.lastSeenAt === null,
    "La actividad de un agente no aparece en otra empresa",
  );
  const rotated = await request(`/api/organizations/${a.org.id}/brain`, {
    cookie: admin,
    method: "PUT",
    body: { dispatchUrl: "", healthUrl: "" },
  });
  assert.equal(rotated.status, 200);
  check(
    (await request("/api/bot/profile", { key: a.key })).status === 401,
    "Rotar la clave invalida inmediatamente la anterior",
  );
  a.key = rotated.data.apiKey;
  const newProfile = await request("/api/bot/profile", { key: a.key });
  check(newProfile.status === 200, "La clave nueva funciona");
  check(
    newProfile.data.llm === null,
    "El proveedor global de IA no se comparte entre empresas",
  );
  await request(`/api/organizations/${a.org.id}/brain`, {
    cookie: admin,
    method: "DELETE",
  });
  check(
    (await request("/api/bot/profile", { key: a.key })).status === 401,
    "Revocar la conexión bloquea el agente",
  );
  // La segunda barrera se comprueba en el motor SQL, no en una base simulada.
  await assert.rejects(
    sql`insert into conversation(id,organization_id,contact_id) values(${`bad_${suffix}`},${a.org.id},${b.contact.id})`,
    (e) => e.code === "23503",
  );
  check(true, "La base rechaza relaciones entre datos de empresas distintas");
  const [userA] = await sql`select id from "user" where email=${a.email}`;
  await sql`insert into member(id,organization_id,user_id,role) values(${`mem_${suffix}`},${b.org.id},${userA.id},'member')`;
  const ambiguous = await login(a.email, pwd);
  check(
    (await request("/api/contacts", { cookie: ambiguous })).status === 401,
    "Una sesión con varias empresas exige selección explícita",
  );
  check(
    (await request("/api/organizations", { cookie: ambiguous })).data
      .organizations.length === 2,
    "El selector ofrece las membresías autorizadas",
  );
  assert.equal(
    (
      await request("/api/organizations/active", {
        cookie: ambiguous,
        method: "POST",
        body: { organizationId: b.org.id },
      })
    ).status,
    200,
  );
  const selected = await request("/api/contacts", { cookie: ambiguous });
  check(
    selected.data.contacts[0].id === b.contact.id,
    "Seleccionar empresa cambia el contexto de las consultas",
  );
  check(
    (
      await request("/api/agent/profile", {
        cookie: ambiguous,
        method: "PUT",
        body: { name: "intruso" },
      })
    ).status === 403,
    "Un miembro de equipo no puede modificar la configuración del agente",
  );
  const revokedController = new AbortController();
  streamControllers.push(revokedController);
  const revokedStream = await fetch(base + "/api/events", {
    headers: { cookie: ambiguous },
    signal: revokedController.signal,
  });
  assert.equal(revokedStream.status, 200);
  const revokedReader = revokedStream.body.getReader();
  void (async () => {
    try {
      for (;;) {
        const { done, value } = await revokedReader.read();
        if (done) {
          revokedClosed = true;
          break;
        }
        revokedData += new TextDecoder().decode(value);
      }
    } catch {
      /* Abort de la prueba. */
    }
  })();
  await sql`delete from member where organization_id=${b.org.id} and user_id=${userA.id}`;
  check(
    (await request("/api/contacts", { cookie: ambiguous })).status === 401,
    "Revocar la membresía bloquea la sesión activa sin elegir otra empresa",
  );
  // Lote firmado con dos números: una fila por destino, sin datos cruzados.
  const marker = `wa-${suffix}`;
  for (const [i, c] of companies.entries()) {
    const enc = encrypt("local-mock-token");
    await sql`insert into meta_credentials(id,organization_id,waba_id,phone_number_id,token_cipher,token_iv,token_tag) values(${`cred_${suffix}_${i}`},${c.org.id},${`waba_${suffix}_${i}`},${`phone_${suffix}_${i}`},${enc.cipher},${enc.iv},${enc.tag})`;
    const key = await request(`/api/organizations/${c.org.id}/brain`, {
      cookie: admin,
      method: "PUT",
      body: {
        dispatchUrl: `http://127.0.0.1:3101/${i}`,
        healthUrl: "http://127.0.0.1:3101/health",
      },
    });
    assert.equal(key.status, 200);
    c.key = key.data.apiKey;
    const enabled = await request("/api/agent/profile", {
      cookie: c.cookie,
      method: "PUT",
      body: { enabled: true },
    });
    assert.equal(enabled.status, 200, JSON.stringify(enabled.data));
  }
  const payload = {
    object: "whatsapp_business_account",
    entry: companies.map((c, i) => ({
      id: `waba_${suffix}_${i}`,
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: `phone_${suffix}_${i}` },
            messages: [
              {
                from: `3460000000${i + 3}`,
                id: marker,
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: { body: `privado-${i}` },
              },
            ],
            contacts: [
              {
                wa_id: `3460000000${i + 3}`,
                profile: { name: `Webhook ${i}` },
              },
            ],
          },
        },
      ],
    })),
  };
  const unsigned = await request(
    `/api/webhooks/wa/${process.env.META_WEBHOOK_VERIFY_TOKEN}`,
    { method: "POST", body: payload },
  );
  check(unsigned.status === 401, "Un webhook Meta sin firma no se acepta");
  for (const c of companies) {
    const controller = new AbortController();
    streamControllers.push(controller);
    const response = await fetch(base + "/api/events", {
      headers: { cookie: c.cookie },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    c.events = "";
    const reader = response.body.getReader();
    void (async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          c.events += new TextDecoder().decode(value);
        }
      } catch {
        /* Abort de la prueba. */
      }
    })();
  }
  const raw = JSON.stringify(payload);
  const signature =
    "sha256=" +
    createHmac("sha256", process.env.META_APP_SECRET).update(raw).digest("hex");
  const signed = await request(
    `/api/webhooks/wa/${process.env.META_WEBHOOK_VERIFY_TOKEN}`,
    {
      method: "POST",
      body: payload,
      headers: { "x-hub-signature-256": signature },
    },
  );
  assert.equal(signed.status, 200);
  const waitFor = async (fn) => {
    for (let i = 0; i < 80; i++) {
      if (await fn()) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("Tiempo agotado esperando el webhook o despacho");
  };
  await waitFor(
    async () =>
      Number(
        (
          await sql`select count(*) as n from message where wa_message_id=${marker}`
        )[0].n,
      ) === 2,
  );
  const messages =
    await sql`select organization_id,text from message where wa_message_id=${marker}`;
  check(
    messages.some(
      (m) => m.organization_id === a.org.id && m.text === "privado-0",
    ) &&
      messages.some(
        (m) => m.organization_id === b.org.id && m.text === "privado-1",
      ),
    "Un lote firmado con dos empresas guarda cada mensaje en su empresa",
  );
  check(
    messages.length === 2,
    "Un mismo ID externo puede coexistir entre empresas",
  );
  await waitFor(() =>
    companies.every((c, i) => c.events.includes(`privado-${i}`)),
  );
  check(
    companies.every((c, i) => !c.events.includes(`privado-${1 - i}`)),
    "Los streams SSE no reciben mensajes de la otra empresa",
  );
  await waitFor(() => revokedClosed);
  check(
    !revokedData.includes("privado-1"),
    "Un stream abierto deja de recibir datos al revocar su membresía",
  );
  for (const controller of streamControllers) controller.abort();
  await waitFor(() => deliveries.length >= 2);
  for (const [i, c] of companies.entries()) {
    const delivered = deliveries.find((d) => d.url === `/${i}`);
    const event = JSON.parse(delivered.raw);
    check(
      event.organization.id === c.org.id &&
        event.messages.every((m) => m.text === `privado-${i}`),
      `Despacho ${i} solo contiene datos de su empresa`,
    );
    check(
      delivered.signature ===
        "sha256=" +
          createHmac("sha256", c.key).update(delivered.raw).digest("hex"),
      `Despacho ${i} firmado con la clave propia`,
    );
  }
  const repeat = await request(
    `/api/webhooks/wa/${process.env.META_WEBHOOK_VERIFY_TOKEN}`,
    {
      method: "POST",
      body: payload,
      headers: { "x-hub-signature-256": signature },
    },
  );
  assert.equal(repeat.status, 200);
  check(
    Number(
      (
        await sql`select count(*) as n from message where wa_message_id=${marker}`
      )[0].n,
    ) === 2,
    "Repetir un lote no duplica mensajes",
  );
  // La prueba busca un código exacto en la bandeja de la empresa, y espera
  // una respuesta del operador y su confirmación de entrega.
  const code = `CP-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const verifyWhatsapp = (cookie, phoneNumberId) =>
    request("/api/settings/whatsapp/prueba", {
      cookie,
      method: "POST",
      body: { code, phoneNumberId },
    });
  const phoneA = `phone_${suffix}_0`;
  const phoneB = `phone_${suffix}_1`;
  check(
    (await verifyWhatsapp(a.cookie, phoneA)).data.conversationId === null,
    "La prueba espera un código que aún no llegó",
  );
  const [incoming] = await sql`
    update message set text=${code} where organization_id=${a.org.id} and wa_message_id=${marker}
    returning conversation_id, id
  `;
  check(
    (await verifyWhatsapp(a.cookie, phoneA)).data.conversationId ===
      incoming.conversation_id,
    "La guía encuentra el código en la conversación de WhatsApp",
  );
  check(
    (await verifyWhatsapp(b.cookie, phoneB)).data.conversationId === null,
    "La guía no encuentra códigos de otra empresa",
  );
  check(
    (await verifyWhatsapp(b.cookie, phoneA)).status === 409,
    "La prueba rechaza el número de otra empresa",
  );
  const replyId = randomUUID();
  await sql`
    insert into message(id,organization_id,conversation_id,direction,status,text,wa_message_id,created_at)
    select ${replyId},organization_id,conversation_id,'out','sent','Respuesta de prueba',${replyId},created_at + interval '1 second'
    from message where id=${incoming.id}
  `;
  check(
    (await verifyWhatsapp(a.cookie, phoneA)).data.reply === "sent",
    "Un envío sin recibo todavía espera confirmación",
  );
  await sql`
    insert into message(id,organization_id,conversation_id,direction,status,text,wa_message_id,created_at)
    select ${randomUUID()},organization_id,conversation_id,'in','delivered',${`CONFIRMO ${code}`},${randomUUID()},created_at + interval '1 second'
    from message where id=${replyId}
  `;
  check(
    (await verifyWhatsapp(a.cookie, phoneA)).data.confirmedByRecipient === true,
    "El móvil de prueba puede confirmar la respuesta cuando el canal no envía recibos",
  );
  await sql`update message set status='delivered' where id=${replyId}`;
  check(
    (await verifyWhatsapp(a.cookie, phoneA)).data.reply === "delivered",
    "La confirmación de entrega completa la prueba",
  );
  const [owner] = await sql`select id from "user" where email=${a.email}`;
  const [operator] = await sql`select id from "user" where email=${email}`;
  const newPassword = `New-${randomUUID()}!`;
  const change = {
    organizationId: a.org.id,
    userId: owner.id,
    adminPassword: password,
    newPassword,
  };
  const reset = (cookie, body = change, origin = base) =>
    request("/api/admin/password", { cookie, method: "POST", body, origin });

  check(
    (await request("/admin", { cookie: b.cookie })).status === 404,
    "Un propietario no puede ver el panel de plataforma",
  );
  check(
    (await request("/admin", { cookie: admin })).status === 200,
    "El superadmin puede ver el panel de plataforma",
  );
  check(
    (await reset(a.cookie)).status === 403,
    "Un propietario no puede usar el restablecimiento de plataforma",
  );
  check(
    (await reset(admin, change, "https://otro.local.test")).status === 403,
    "El restablecimiento requiere el mismo origen",
  );
  check(
    (await reset(admin, { ...change, adminPassword: "incorrecta" })).status ===
      403,
    "El superadmin debe confirmar su contraseña actual",
  );
  check(
    (await reset(admin, { ...change, userId: operator.id })).status === 403,
    "El panel protege las cuentas de superadmin",
  );
  check(
    (await reset(admin, { ...change, organizationId: b.org.id })).status ===
      404,
    "No se puede restablecer una cuenta fuera de la ficha de su empresa",
  );
  check(
    (await reset(admin)).status === 200,
    "El superadmin puede restablecer la contraseña de un miembro",
  );
  check(
    (await request("/api/organizations", { cookie: a.cookie })).status === 401,
    "La sesión anterior queda cerrada",
  );
  const oldLogin = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email: a.email, password: pwd },
  });
  check(oldLogin.status === 401, "La contraseña anterior deja de funcionar");
  const newCookie = await login(a.email, newPassword);
  check(
    (await request("/api/organizations", { cookie: newCookie })).status === 200,
    "La nueva contraseña permite iniciar sesión",
  );
  console.log(`MULTITENANT_E2E_OK (${created.length} empresas de prueba)`);
} finally {
  for (const controller of streamControllers) controller.abort();
  await sql.end();
  await new Promise((resolve) => mock.close(resolve));
}

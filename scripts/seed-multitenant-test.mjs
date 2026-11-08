/** Crea exclusivamente el administrador de una base local vacía de pruebas. */
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
const base = process.env.APP_BASE_URL;
const url = process.env.DATABASE_URL;
if (
  !base ||
  !url ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
  process.env.WA_MOCK_ENABLED !== "true"
)
  throw new Error("Solo base local desechable con mocks");
const sql = postgres(url, {
  max: 1,
  onnotice: () => {},
  connection: { TimeZone: "UTC" },
});
try {
  const [users] = await sql`select count(*) as n from "user"`;
  if (Number(users.n) !== 0) throw new Error("La base debe estar vacía");
  const email = process.env.E2E_ADMIN_EMAIL,
    password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error("Faltan credenciales de prueba");
  const id = "multitenant-test-admin";
  if (!(process.env.PLATFORM_ADMIN_USER_IDS ?? "").split(",").includes(id))
    throw new Error(
      "PLATFORM_ADMIN_USER_IDS debe incluir multitenant-test-admin",
    );
  const hash = await hashPassword(password);
  await sql.begin(async (tx) => {
    await tx`insert into "user"(id,name,email,email_verified) values(${id},'Administrador de pruebas',${email},true)`;
    await tx`insert into account(id,account_id,provider_id,user_id,password) values('multitenant-test-account',${id},'credential',${id},${hash})`;
    // Evita que el hook de primer registro cree una empresa inesperada al aprovisionar propietarios.
    await tx`insert into organization(id,name,slug) values('multitenant-test-initial','Empresa inicial','principal')`;
    await tx`insert into member(id,organization_id,user_id,role) values('multitenant-test-member','multitenant-test-initial',${id},'owner')`;
    await tx`insert into agent_profile(id,organization_id) values('multitenant-test-profile','multitenant-test-initial')`;
  });
  console.log("Administrador de pruebas preparado");
} finally {
  await sql.end();
}

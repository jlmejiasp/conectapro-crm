import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | ConectaPro CRM",
  description: "Información sobre el tratamiento de datos personales en ConectaPro CRM.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 leading-7 text-foreground">
      <Link href="/login" className="text-sm underline underline-offset-4">
        ConectaPro CRM
      </Link>
      <h1 className="mt-8 text-3xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Actualizada el 2 de noviembre de 2026.</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Responsable y contacto</h2>
        <p>
          BItcodi, titular de ConectaPro CRM, calle Conde de Villamediana 12, 28300 Aranjuez, Madrid, España.
          Para consultas o solicitudes sobre privacidad: {" "}
          <a href="mailto:info@conectapro.es" className="underline underline-offset-4">
            info@conectapro.es
          </a>.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Qué datos tratamos</h2>
        <p>
          El CRM puede almacenar los datos de acceso de sus usuarios, los datos de contacto de
          clientes y prospectos, conversaciones y archivos enviados por los canales conectados,
          notas comerciales, citas y datos técnicos necesarios para mantener la seguridad y el
          funcionamiento del servicio. Los datos concretos dependen de las funciones y canales
          que se utilicen.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Para qué usamos los datos</h2>
        <p>
          Los usamos para proporcionar el acceso al CRM, gestionar conversaciones, contactos y
          citas, atender solicitudes, mantener la seguridad y resolver incidencias. Cuando se
          habilitan funciones adicionales, también pueden usarse para preparar respuestas con un
          proveedor de inteligencia artificial o medir resultados de campañas.
        </p>
        <p>
          El tratamiento necesario para prestar el servicio se basa en la relación contractual.
          La seguridad y la atención de incidencias se basan en nuestro interés legítimo. Las
          comunicaciones comerciales requieren una base legal adecuada en cada caso, como el
          consentimiento cuando sea exigible.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Procedencia y destinatarios</h2>
        <p>
          Los datos pueden llegar directamente de las personas, de los usuarios del CRM o de los
          canales que estos conecten, como WhatsApp, Instagram y Messenger de Meta. Para operar el
          servicio pueden intervenir proveedores de alojamiento, Meta y los proveedores de
          inteligencia artificial u otras integraciones que se activen. Cada canal o integración
          puede tener su propia política de privacidad.
        </p>
        <p>
          Algunas integraciones pueden implicar acceso desde fuera del Espacio Económico Europeo.
          En esos casos, se aplicarán los mecanismos de transferencia previstos por la normativa
          de protección de datos que correspondan al proveedor utilizado.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Conservación</h2>
        <p>
          Conservamos los datos mientras sean necesarios para prestar el servicio y gestionar la
          relación con los usuarios. Después, podrán mantenerse bloqueados durante los plazos
          exigidos para atender obligaciones legales o posibles responsabilidades. Los usuarios
          pueden eliminar contactos y conversaciones desde el CRM, según las funciones disponibles.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Tus derechos y eliminación de datos</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, oposición, limitación del tratamiento
          o portabilidad, cuando corresponda, escribiendo a {" "}
          <a href="mailto:info@conectapro.es" className="underline underline-offset-4">
            info@conectapro.es
          </a>. Indica los datos o la cuenta afectados y cómo podemos localizar tu solicitud. Si
          necesitamos confirmar tu identidad, te pediremos la información mínima necesaria. Para
          solicitar la eliminación de datos asociados a Meta, utiliza ese mismo correo e indica el
          canal y número o perfil con el que contactaste.
        </p>
        <p>
          También puedes presentar una reclamación ante la {" "}
          <a href="https://www.aepd.es/" className="underline underline-offset-4">
            Agencia Española de Protección de Datos
          </a>.
        </p>
      </section>
    </main>
  );
}

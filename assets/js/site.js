/* Kunz Agrotech — comportamiento del sitio (sin dependencias) */
(function () {
  "use strict";

  var CONTACT = {
    whatsapp: "59892800358",
    email: "stanley@kunzagrotech.com",
    greeting: "Hola, quisiera consultar por un servicio agrícola con dron.",
  };

  var header = document.querySelector(".header");
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("menu");
  var waFloat = document.querySelector(".wa-float");
  var contact = document.getElementById("contacto");

  /* Header y botón flotante */
  var contactVisible = false;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-solid", y > 24);
    if (waFloat) waFloat.classList.toggle("is-on", y > window.innerHeight * 0.7 && !contactVisible);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Menú móvil */
  function setMenu(open) {
    header.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () {
    setMenu(burger.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && header.classList.contains("is-open")) {
      setMenu(false);
      burger.focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", function (e) {
    if (e.matches) setMenu(false);
  });

  /* Entrada suave de secciones */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    items.forEach(function (el) { io.observe(el); });

    if (contact) {
      new IntersectionObserver(function (entries) {
        contactVisible = entries[0].isIntersecting;
        onScroll();
      }, { threshold: 0.15 }).observe(contact);
    }
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Formulario de consulta
     Sin servidor: arma el mensaje y lo abre en WhatsApp o en el correo del visitante.
     Con data-endpoint en el <form>, envía los datos como JSON a esa dirección. */
  var form = document.getElementById("consulta");
  if (!form) return;
  var done = document.querySelector(".form-done");
  var error = form.querySelector(".form-error");
  var retry = done.querySelector("[data-retry]");

  function value(name) {
    return (form.elements[name].value || "").trim();
  }

  function message() {
    var lines = [CONTACT.greeting, ""];
    [
      ["Nombre", "nombre"],
      ["Teléfono", "telefono"],
      ["Zona", "zona"],
      ["Superficie aprox.", "superficie"],
      ["Tipo de trabajo", "tipo"],
      ["Mensaje", "mensaje"],
    ].forEach(function (f) {
      var v = value(f[1]);
      if (v) lines.push(f[0] + ": " + v);
    });
    return lines.join("\n");
  }

  function validate() {
    var ok = true;
    ["nombre", "telefono"].forEach(function (n) {
      var el = form.elements[n];
      var bad = !value(n);
      el.classList.toggle("is-invalid", bad);
      el.setAttribute("aria-invalid", String(bad));
      if (bad && ok) el.focus();
      if (bad) ok = false;
    });
    error.hidden = ok;
    return ok;
  }

  function showDone(kind, url, text) {
    done.querySelectorAll("[data-done]").forEach(function (p) {
      p.hidden = p.getAttribute("data-done") !== kind;
    });
    done.querySelectorAll("[data-done-title]").forEach(function (h) {
      h.hidden = h.getAttribute("data-done-title") !== kind;
    });
    done.querySelector(".form-done__step").hidden = kind === "sent";
    var preview = done.querySelector("[data-preview]");
    preview.textContent = text || "";
    preview.hidden = !text;
    retry.hidden = !url;
    if (url) {
      retry.href = url;
      retry.querySelector("svg").style.display = kind === "mail" ? "none" : "";
      retry.querySelector("[data-retry-label]").textContent = kind === "mail" ? "Abrir el correo de nuevo" : "Abrir WhatsApp de nuevo";
      if (kind === "mail") retry.removeAttribute("target");
      else retry.setAttribute("target", "_blank");
    }
    form.hidden = true;
    done.hidden = false;
    done.focus();
  }

  function send(kind) {
    if (!validate()) return;
    var text = message();
    var endpoint = form.getAttribute("data-endpoint");

    if (endpoint && kind === "wa") {
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      var button = form.querySelector('[type="submit"]');
      button.disabled = true;
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) })
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          showDone("sent", "");
        })
        .catch(function () {
          openWhatsApp(text);
        })
        .finally(function () { button.disabled = false; });
      return;
    }
    if (kind === "mail") {
      var mail = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Consulta por servicio agrícola con dron") + "&body=" + encodeURIComponent(text);
      window.location.href = mail;
      showDone("mail", mail, text);
      return;
    }
    openWhatsApp(text);
  }

  function openWhatsApp(text) {
    var url = "https://wa.me/" + CONTACT.whatsapp + "?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener");
    showDone("wa", url, text);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    send("wa");
  });
  form.querySelector('[data-send="mail"]').addEventListener("click", function () { send("mail"); });
  form.addEventListener("input", function (e) {
    if (e.target.classList.contains("is-invalid") && e.target.value.trim()) {
      e.target.classList.remove("is-invalid");
      e.target.setAttribute("aria-invalid", "false");
    }
  });
  done.querySelector("[data-edit]").addEventListener("click", function () {
    done.hidden = true;
    form.hidden = false;
    form.elements.nombre.focus();
  });
})();

/* Kunz Agrotech — comportamiento del sitio (sin dependencias) */
(function () {
  "use strict";

  var CONTACT = {
    whatsapp: "59892800358",
    email: "stanley@kunzagrotech.com",
  };

  /* Textos que genera el script, por idioma de la página (<html lang>). Los textos del HTML están en i18n/<lang>.json. */
  var STRINGS = {
    es: { greeting: "Hola, quisiera consultar por un servicio agrícola con dron.", name: "Nombre", phone: "Teléfono", zone: "Zona", area: "Superficie aprox.", type: "Tipo de trabajo", msg: "Mensaje", subject: "Consulta por servicio agrícola con dron", openMenu: "Abrir menú", closeMenu: "Cerrar menú", retryWa: "Abrir WhatsApp de nuevo", retryMail: "Abrir el correo de nuevo", hint: "Esta página también está disponible en español.", hintGo: "Ver en español", hintClose: "Cerrar" },
    en: { greeting: "Hello, I would like to ask about an agricultural drone service.", name: "Name", phone: "Phone", zone: "Area", area: "Approx. size", type: "Type of work", msg: "Message", subject: "Request: agricultural drone service", openMenu: "Open menu", closeMenu: "Close menu", retryWa: "Open WhatsApp again", retryMail: "Open email again", hint: "This page is also available in English.", hintGo: "View in English", hintClose: "Close" },
    de: { greeting: "Hallo, ich interessiere mich für einen landwirtschaftlichen Drohneneinsatz.", name: "Name", phone: "Telefon", zone: "Region", area: "Fläche ca.", type: "Art des Einsatzes", msg: "Nachricht", subject: "Anfrage: landwirtschaftlicher Drohneneinsatz", openMenu: "Menü öffnen", closeMenu: "Menü schließen", retryWa: "WhatsApp erneut öffnen", retryMail: "E-Mail erneut öffnen", hint: "Diese Seite gibt es auch auf Deutsch.", hintGo: "Auf Deutsch ansehen", hintClose: "Schließen" },
    pt: { greeting: "Olá, gostaria de saber mais sobre um serviço agrícola com drone.", name: "Nome", phone: "Telefone", zone: "Região", area: "Área aprox.", type: "Tipo de trabalho", msg: "Mensagem", subject: "Consulta: serviço agrícola com drone", openMenu: "Abrir menu", closeMenu: "Fechar menu", retryWa: "Abrir o WhatsApp de novo", retryMail: "Abrir o e-mail de novo", hint: "Esta página também está disponível em português.", hintGo: "Ver em português", hintClose: "Fechar" },
  };
  var LANG = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  if (!STRINGS[LANG]) LANG = "es";
  var T = STRINGS[LANG];
  var LANG_PATH = { es: "/", en: "/en/", de: "/de/", pt: "/pt/" };

  // localStorage puede fallar (modo privado, datos bloqueados): la página funciona igual.
  function readStore(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function writeStore(key, value) { try { window.localStorage.setItem(key, value); } catch (e) {} }

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
    burger.setAttribute("aria-label", open ? T.closeMenu : T.openMenu);
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
  window.matchMedia("(min-width: 1181px)").addEventListener("change", function (e) {
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

  /* Video de campo: se descarga recién al tocar "reproducir" (ahorra datos móviles). Sin sonido. */
  document.querySelectorAll(".field__player").forEach(function (player) {
    var button = player.querySelector(".field__play");
    if (!button) return;
    button.addEventListener("click", function () {
      var video = document.createElement("video");
      video.src = player.getAttribute("data-src");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.loop = true;
      video.controls = true;
      var caption = player.parentElement.querySelector("figcaption");
      video.setAttribute("aria-label", caption ? caption.firstChild.textContent.trim() : "Video");
      var picture = player.querySelector("picture");
      if (picture) video.poster = (picture.querySelector("img").currentSrc || "");
      player.appendChild(video);
      player.classList.add("is-playing");
      player.parentElement.classList.add("is-playing");
      button.remove();
      if (picture) picture.remove();
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      video.focus();
    });
  });

  /* Idiomas: el cambio conserva la sección actual (#ancla) y recuerda la elección en este navegador.
     No hay redirección automática: si el navegador usa otro idioma disponible, solo se muestra un aviso discreto. */
  document.querySelectorAll(".lang a[data-lang]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      writeStore("ka_lang", a.getAttribute("data-lang"));
      if (location.hash && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        location.href = a.getAttribute("href") + location.hash;
      }
    });
  });
  (function suggestLanguage() {
    if (readStore("ka_lang") || readStore("ka_lang_hint")) return;
    var wanted = null;
    (navigator.languages || [navigator.language || ""]).some(function (l) {
      var code = String(l).slice(0, 2).toLowerCase();
      if (STRINGS[code]) { wanted = code; return true; }
      return false;
    });
    if (!wanted || wanted === LANG) return;
    var S = STRINGS[wanted];
    var box = document.createElement("div");
    box.className = "lang-hint";
    box.setAttribute("role", "status");
    box.setAttribute("lang", wanted);
    var text = document.createElement("p");
    text.textContent = S.hint;
    var go = document.createElement("a");
    go.textContent = S.hintGo;
    go.href = LANG_PATH[wanted] + location.hash;
    go.addEventListener("click", function () { writeStore("ka_lang", wanted); });
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", S.hintClose);
    close.textContent = "×";
    close.addEventListener("click", function () { writeStore("ka_lang_hint", "1"); box.remove(); });
    box.appendChild(text);
    box.appendChild(go);
    box.appendChild(close);
    document.body.appendChild(box);
  })();

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
    var lines = [T.greeting, ""];
    [
      [T.name, "nombre"],
      [T.phone, "telefono"],
      [T.zone, "zona"],
      [T.area, "superficie"],
      [T.type, "tipo"],
      [T.msg, "mensaje"],
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
      retry.querySelector("[data-retry-label]").textContent = kind === "mail" ? T.retryMail : T.retryWa;
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
      var mail = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent(T.subject) + "&body=" + encodeURIComponent(text);
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

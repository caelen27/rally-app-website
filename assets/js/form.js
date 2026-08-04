/* =========================================================================
   Rally — early access form

   ─────────────────────────────────────────────────────────────────────────
   TO GO LIVE: put your endpoint in FORM_ENDPOINT below. That is the only
   change needed. Anything that accepts a JSON POST works: a Formspree form
   URL, a Supabase edge function, a Vercel serverless route.

   While it is empty the form validates normally but tells the visitor
   plainly that it is not connected yet and gives them an email address,
   rather than pretending a submission was received.
   ───────────────────────────────────────────────────────────────────────── */

var FORM_ENDPOINT = "";

(function () {
  "use strict";

  var form = document.getElementById("earlyAccess");
  if (!form) return;

  var statusEl = document.getElementById("formStatus");
  var doneEl = document.getElementById("formDone");
  var submitBtn = document.getElementById("submitBtn");

  /* ---------------- validation ---------------- */

  function wrapOf(input) { return input.closest("[data-field]"); }

  function problem(input) {
    var v = input.value.trim();
    if (input.required && !v) return input.dataset.error;
    if (input.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return input.dataset.error;
    if (input.minLength > 0 && v && v.length < input.minLength) return input.dataset.error;
    return null;
  }

  function show(input) {
    var wrap = wrapOf(input);
    if (!wrap) return true;
    var msg = problem(input);
    var out = wrap.querySelector(".field-error");
    if (msg) {
      wrap.setAttribute("data-invalid", "");
      input.setAttribute("aria-invalid", "true");
      if (out) { out.textContent = msg; input.setAttribute("aria-describedby", out.id); }
      return false;
    }
    wrap.removeAttribute("data-invalid");
    input.removeAttribute("aria-invalid");
    if (out) out.textContent = "";
    return true;
  }

  var fields = Array.prototype.slice.call(form.querySelectorAll("[data-field] input, [data-field] textarea"));

  fields.forEach(function (input) {
    // validate on blur, then live once it has been marked wrong, so the form
    // never turns red while someone is still mid-word
    input.addEventListener("blur", function () { show(input); });
    input.addEventListener("input", function () {
      if (wrapOf(input) && wrapOf(input).hasAttribute("data-invalid")) show(input);
    });
  });

  /* ---------------- submit ---------------- */

  function setStatus(state, html) {
    if (!state) { statusEl.removeAttribute("data-state"); statusEl.textContent = ""; return; }
    statusEl.setAttribute("data-state", state);
    statusEl.textContent = "";
    html.forEach(function (node) { statusEl.appendChild(node); });
  }

  function text(t) { return document.createTextNode(t); }
  function mailLink() {
    var a = document.createElement("a");
    a.href = "mailto:caelen@truemeridianai.com?subject=Rally%20early%20access";
    a.textContent = "caelen@truemeridianai.com";
    return a;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus(null);

    var ok = true;
    fields.forEach(function (input) { if (!show(input)) ok = false; });

    if (!ok) {
      var firstBad = form.querySelector("[data-invalid] input, [data-invalid] textarea");
      if (firstBad) firstBad.focus();
      return;
    }

    if (!FORM_ENDPOINT) {
      setStatus("pending", [
        text("This form is not connected to a backend yet, so nothing was sent. Email us at "),
        mailLink(),
        text(" and we will add you to the list by hand.")
      ]);
      return;
    }

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      audience: form.audience.value,
      message: form.message.value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending";

    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.hidden = true;
        doneEl.setAttribute("data-shown", "");
        doneEl.setAttribute("tabindex", "-1");
        doneEl.focus();
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Request early access";
        setStatus("error", [
          text("Something went wrong sending that. Try again, or email "),
          mailLink(),
          text(" instead.")
        ]);
      });
  });
})();

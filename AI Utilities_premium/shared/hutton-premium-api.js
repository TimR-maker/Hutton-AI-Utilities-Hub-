/*
  Teacher AI Hub Premium API helper
  Location in your site: AI Utilities_premium/shared/hutton-premium-api.js

  Purpose:
  - Reuse the same front-end API workflow in every Premium utility.
  - Keep each utility's own prompt builder, schema and renderer.
*/
(function () {
  function byId(idOrElement) {
    if (!idOrElement) return null;
    if (typeof idOrElement === "string") return document.getElementById(idOrElement);
    return idOrElement;
  }

  function setStatus(statusEl, message, kind) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.remove("hidden", "ok", "bad", "warning");
    if (kind) statusEl.classList.add(kind);
  }

  function clearStatus(statusEl) {
    if (!statusEl) return;
    statusEl.textContent = "";
    statusEl.classList.add("hidden");
    statusEl.classList.remove("ok", "bad", "warning");
  }

  function disableButton(button, disabled, busyText) {
    if (!button) return;
    if (disabled) {
      if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = busyText || "Generating...";
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    }
  }

  function hideManualWorkflow(selectors) {
    for (const selector of selectors || []) {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add("hidden");
        el.setAttribute("aria-hidden", "true");
      });
    }
  }

  async function generateResource(options) {
    const button = byId(options.button);
    const statusEl = byId(options.status);
    const endpoint = options.endpoint || "/.netlify/functions/generate-resource";
    const idleText = options.idleText || (button ? button.textContent : "Generate");
    const busyText = options.busyText || "Generating...";

    try {
      clearStatus(statusEl);
      disableButton(button, true, busyText);

      if (typeof options.validate === "function") {
        const validationMessage = options.validate();
        if (validationMessage) {
          setStatus(statusEl, validationMessage, "bad");
          return null;
        }
      }

      if (typeof options.buildPrompt !== "function") {
        throw new Error("Premium setup error: buildPrompt must be a function.");
      }
      if (!options.schema || typeof options.schema !== "object") {
        throw new Error("Premium setup error: schema must be supplied.");
      }
      if (typeof options.onSuccess !== "function") {
        throw new Error("Premium setup error: onSuccess must be a function.");
      }

      const prompt = String(options.buildPrompt() || "").trim();
      if (!prompt) {
        setStatus(statusEl, "Nothing to generate. Please complete the form first.", "bad");
        return null;
      }

      setStatus(statusEl, options.loadingMessage || "Generating resource...", "warning");

      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          schema: options.schema,
          schemaName: options.schemaName || "teacher_ai_hub_resource",
          systemMessage: options.systemMessage || "You generate classroom-ready UK secondary school teaching resources. Return only JSON that matches the supplied schema."
        })
      };
      let response;
      let responseText = "";
      let data = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch(endpoint, requestOptions);
        responseText = await response.text();
        try { data = JSON.parse(responseText); } catch (error) { data = null; }
        if (data) break;
        if (attempt < 2 && (!response.ok || !responseText.trim())) {
          setStatus(statusEl, options.retryMessage || options.loadingMessage || "Still preparing your resource...", "warning");
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        const detail = responseText.trim().replace(/\s+/g, " ").slice(0, 140);
        throw new Error("The server returned " + response.status + " " + response.statusText + " instead of JSON" + (detail ? ": " + detail : "."));
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Automatic generation failed.");
      }

      await options.onSuccess(data.result, data);
      setStatus(statusEl, options.successMessage || "Resource generated successfully.", "ok");
      return data.result;
    } catch (error) {
      console.error("Teacher AI Hub Premium generation error:", error);
      setStatus(
        statusEl,
        (options.failurePrefix || "Automatic generation failed") + ": " + (error.message || error),
        "bad"
      );
      return null;
    } finally {
      disableButton(button, false);
      if (button && idleText && !button.dataset.originalText) button.textContent = idleText;
    }
  }

  window.HuttonPremiumAPI = {
    generateResource,
    hideManualWorkflow,
    setStatus,
    clearStatus
  };
})();

/*
 * Covenant survey — client application.
 * Renders the intro, the multi-step form, the review and the thank-you screen.
 */
(function () {
  "use strict";

  var SURVEY = window.SURVEY;
  var BRAND = window.BRAND;

  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var DRAFT_KEY = "covenant_survey_draft_v1";
  var DRAFT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

  var state = {
    screen: "intro",
    answers: {},
    step: 0,
    startedAt: null,
    consent: false,
    errors: {},
    submitting: false,
    submittedId: "",
    draft: null,
    lastSavedAt: null
  };

  var saveTimer = null;
  var toastTimer = null;

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2600);
  }

  function formatDate(timestamp) {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long"
      });
    } catch (_) {
      return "earlier";
    }
  }

  function debounceSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  }

  function saveDraft() {
    try {
      var payload = {
        answers: state.answers,
        step: state.step,
        startedAt: state.startedAt,
        consent: state.consent,
        savedAt: Date.now(),
        version: SURVEY.version
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      state.lastSavedAt = payload.savedAt;
    } catch (_) {
      /* storage unavailable — the survey still works without autosave */
    }
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
      if (!parsed.savedAt || Date.now() - parsed.savedAt > DRAFT_MAX_AGE) {
        localStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function getSteps() {
    var visible = SURVEY.visibleQuestions(state.answers);
    var steps = [];
    SURVEY.sections.forEach(function (section) {
      var questions = visible.filter(function (question) {
        return question.section === section.id;
      });
      if (questions.length) steps.push({ section: section, questions: questions });
    });
    return steps;
  }

  function findQuestion(id) {
    for (var i = 0; i < SURVEY.questions.length; i += 1) {
      if (SURVEY.questions[i].id === id) return SURVEY.questions[i];
    }
    return null;
  }

  function isAnswered(question) {
    return SURVEY.isAnswered(question, state.answers);
  }

  function answerText(question) {
    var value = state.answers[question.id];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) {
      return "";
    }
    if (question.type === "scale") {
      return value + " / 5";
    }
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          if (item === "other") {
            var other = state.answers[question.id + "_other"];
            return other ? "Other: " + other : "Other";
          }
          return SURVEY.optionLabel(question, item);
        })
        .join(" · ");
    }
    if (value === "other") {
      var text = state.answers[question.id + "_other"];
      return text ? "Other: " + text : "Other";
    }
    return SURVEY.optionLabel(question, value);
  }

  /* ------------------------------------------------------------------ */
  /* Intro                                                               */
  /* ------------------------------------------------------------------ */

  function renderIntro() {
    var d = state.draft;

    var chips = [
      {
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
        label: BRAND.duration
      },
      {
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 4h8M8 20h8M9 4c0 3 1.4 4.6 3 6 1.6-1.4 3-3 3-6M9 20c0-3 1.4-4.6 3-6 1.6 1.4 3 3 3 6"/></svg>',
        label: BRAND.questionCount
      },
      {
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4.5" y="10" width="15" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/></svg>',
        label: BRAND.anonymity
      }
    ];

    var chipsHtml = chips
      .map(function (chip) {
        return '<span class="chip">' + chip.icon + escapeHtml(chip.label) + "</span>";
      })
      .join("");

    var privacyItems = (BRAND.privacyDetails || [])
      .map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      })
      .join("");

    var resumeHtml = d
      ? '<div class="resume">' +
        '<p class="resume-text"><strong>Welcome back.</strong> You have a saved draft from ' +
        escapeHtml(formatDate(d.savedAt)) +
        ".</p>" +
        '<div class="resume-actions">' +
        '<button type="button" class="btn btn-primary btn-small" data-action="resume">Continue draft</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="discard">Start over</button>' +
        "</div>" +
        "</div>"
      : "";

    app.innerHTML =
      '<section class="intro">' +
      '<div class="intro-copy">' +
      '<p class="eyebrow"><span class="eyebrow-rule" aria-hidden="true"></span>Christian dating research · 2026</p>' +
      "<h1 class=\"display\">" +
      "Help shape a dating app built on <em>faith</em>, not games." +
      "</h1>" +
      '<p class="lede">' +
      escapeHtml(BRAND.intro) +
      "</p>" +
      '<p class="intro-note">' +
      escapeHtml(BRAND.introNote) +
      "</p>" +
      '<div class="meta-chips">' +
      chipsHtml +
      "</div>" +
      "</div>" +
      '<div class="intro-aside" aria-hidden="true">' +
      '<div class="seal">' +
      '<div class="seal-inner">' +
      '<span class="seal-monogram">' +
      escapeHtml(BRAND.monogram) +
      "</span>" +
      '<span class="seal-word">' +
      escapeHtml(BRAND.name) +
      "</span>" +
      '<span class="seal-rule"></span>' +
      '<span class="seal-note">Faith · Trust · Intent</span>' +
      "</div>" +
      "</div>" +
      '<div class="aside-card">' +
      '<p class="aside-quote">“No swipe fatigue. No games. Just a serious way to meet someone who shares your faith.”</p>' +
      '<p class="aside-byline">The product we are researching</p>' +
      "</div>" +
      "</div>" +
      "</section>" +
      '<section class="panel start-panel" aria-labelledby="before-title">' +
      resumeHtml +
      '<h2 class="start-title" id="before-title">Before you begin</h2>' +
      '<p class="start-copy">' +
      escapeHtml(BRAND.privacySummary) +
      "</p>" +
      '<label class="consent" for="consent">' +
      '<input type="checkbox" id="consent" ' +
      (state.consent ? "checked" : "") +
      " />" +
      '<span class="consent-text"><strong>I am 18 or older and agree to take part.</strong> I understand my answers are used for product research and that I can stop at any time.</span>' +
      "</label>" +
      '<details class="privacy">' +
      "<summary>How your answers are handled</summary>" +
      '<div class="privacy-body"><p>' +
      escapeHtml(BRAND.privacySummary) +
      "</p><ul>" +
      privacyItems +
      "</ul></div>" +
      "</details>" +
      '<div class="start-actions">' +
      '<button type="button" class="btn btn-primary" id="start-btn" data-action="start" ' +
      (state.consent ? "" : "disabled") +
      '>Start the survey <span class="arrow" aria-hidden="true">→</span></button>' +
      '<span class="autosave-note">Progress saves on this device</span>' +
      "</div>" +
      "</section>";

    var checkbox = document.getElementById("consent");
    var startBtn = document.getElementById("start-btn");
    if (checkbox && startBtn) {
      checkbox.addEventListener("change", function () {
        state.consent = checkbox.checked;
        startBtn.disabled = !checkbox.checked;
        saveDraft();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Question rendering                                                  */
  /* ------------------------------------------------------------------ */

  function describedBy(question) {
    var ids = [];
    if (question.help) ids.push("help-" + question.id);
    if (state.errors[question.id]) ids.push("err-" + question.id);
    return ids.length ? ' aria-describedby="' + ids.join(" ") + '"' : "";
  }

  function renderOptions(question) {
    var isMulti = question.type === "multi";
    var selected = state.answers[question.id];
    var selectedList = Array.isArray(selected) ? selected : [];

    return SURVEY.optionsFor(question)
      .map(function (option, index) {
        var checked = isMulti
          ? selectedList.indexOf(option.value) !== -1
          : selected === option.value;
        var inputType = isMulti ? "checkbox" : "radio";
        var inputId = question.id + "-" + index;
        return (
          '<label class="option' +
          (checked ? " is-checked" : "") +
          '" data-type="' +
          question.type +
          '" for="' +
          inputId +
          '">' +
          '<input type="' +
          inputType +
          '" id="' +
          inputId +
          '" name="' +
          question.id +
          '" value="' +
          escapeHtml(option.value) +
          '"' +
          (checked ? " checked" : "") +
          (option.exclusive ? ' data-exclusive="true"' : "") +
          " />" +
          '<span class="option-mark" aria-hidden="true"></span>' +
          '<span class="option-text">' +
          escapeHtml(option.label) +
          "</span>" +
          "</label>"
        );
      })
      .join("");
  }

  function renderOtherField(question) {
    if (!question.allowOther) return "";
    var selected = state.answers[question.id];
    var isOther = Array.isArray(selected)
      ? selected.indexOf("other") !== -1
      : selected === "other";
    var value = state.answers[question.id + "_other"] || "";
    return (
      '<div class="other-field" data-other-for="' +
      question.id +
      '"' +
      (isOther ? "" : " hidden") +
      ">" +
      '<label class="field-label" for="other-' +
      question.id +
      '">' +
      escapeHtml(question.otherLabel || "Please describe") +
      "</label>" +
      '<input class="input" type="text" id="other-' +
      question.id +
      '" name="' +
      question.id +
      '_other" data-other-for="' +
      question.id +
      '" maxlength="200" autocomplete="off" value="' +
      escapeHtml(value) +
      '" />' +
      "</div>"
    );
  }

  function renderScale(question) {
    var scale = question.scale || { min: 1, max: 5, minLabel: "", maxLabel: "" };
    var buttons = "";
    for (var value = scale.min; value <= scale.max; value += 1) {
      var checked = Number(state.answers[question.id]) === value;
      buttons +=
        '<label class="scale-option' +
        (checked ? " is-checked" : "") +
        '">' +
        '<input type="radio" name="' +
        question.id +
        '" value="' +
        value +
        '"' +
        (checked ? " checked" : "") +
        " />" +
        '<span class="scale-num">' +
        value +
        "</span>" +
        "</label>";
    }
    return (
      '<div class="scale-wrap">' +
      '<div class="scale">' +
      buttons +
      "</div>" +
      '<div class="scale-ends"><span>' +
      escapeHtml(scale.minLabel) +
      "</span><span>" +
      escapeHtml(scale.maxLabel) +
      "</span></div>" +
      "</div>"
    );
  }

  function renderText(question) {
    var value = state.answers[question.id] || "";
    var isEmail = question.type === "email";
    var maxLength = question.maxLength || 2000;
    var field = isEmail
      ? '<input class="input" type="email" id="f-' +
        question.id +
        '" name="' +
        question.id +
        '" value="' +
        escapeHtml(value) +
        '" placeholder="' +
        escapeHtml(question.placeholder || "") +
        '" inputmode="email" autocomplete="email" maxlength="' +
        maxLength +
        '" />'
      : '<textarea class="textarea" id="f-' +
        question.id +
        '" name="' +
        question.id +
        '" rows="5" maxlength="' +
        maxLength +
        '" placeholder="' +
        escapeHtml(question.placeholder || "") +
        '">' +
        escapeHtml(value) +
        "</textarea>";

    return (
      '<div class="text-field">' +
      field +
      '<div class="field-foot"><span class="char-count" data-count-for="' +
      question.id +
      '">' +
      String(value).length +
      " / " +
      maxLength +
      "</span></div></div>"
    );
  }

  function renderQuestion(question, compact, hidden) {
    var hasError = Boolean(state.errors[question.id]);
    var body = "";
    if (question.type === "single" || question.type === "multi") {
      body = '<div class="options">' + renderOptions(question) + "</div>" + renderOtherField(question);
    } else if (question.type === "scale") {
      body = renderScale(question);
    } else {
      body = renderText(question);
    }

    return (
      '<fieldset class="question' +
      (compact ? " question-compact" : "") +
      (hasError ? " has-error" : "") +
      '" data-qid="' +
      question.id +
      '"' +
      (question.visibleIf ? ' data-conditional="true"' : "") +
      (hidden ? " hidden" : "") +
      describedBy(question) +
      ">" +
      '<legend class="question-legend"><span class="question-title">' +
      escapeHtml(question.title) +
      (question.required
        ? '<span class="req" aria-hidden="true">*</span><span class="sr-only"> (required)</span>'
        : "") +
      "</span></legend>" +
      (question.help
        ? '<p class="question-help" id="help-' + question.id + '">' + escapeHtml(question.help) + "</p>"
        : "") +
      body +
      '<p class="error-text" id="err-' +
      question.id +
      '" role="alert"' +
      (hasError ? "" : " hidden") +
      ">" +
      escapeHtml(state.errors[question.id] || "") +
      "</p>" +
      "</fieldset>"
    );
  }

  function renderQuestions(questions) {
    var html = "";
    var groupOpen = false;

    questions.forEach(function (question) {
      var inGroup = question.group === "importance";
      if (inGroup && !groupOpen) {
        html +=
          '<div class="question-group">' +
          '<div class="group-head">' +
          '<h2 class="group-title">How important is each of the following?</h2>' +
          '<p class="group-help">Rate from 1 (not important) to 5 (essential).</p>' +
          "</div>";
        groupOpen = true;
      }
      if (!inGroup && groupOpen) {
        html += "</div>";
        groupOpen = false;
      }
      html += renderQuestion(question, inGroup, !SURVEY.isVisible(question, state.answers));
    });

    if (groupOpen) html += "</div>";

    return html;
  }

  function questionsForSection(sectionId, visibleQuestions) {
    var list = visibleQuestions.slice();
    SURVEY.questions.forEach(function (question) {
      if (question.section !== sectionId) return;
      if (!question.visibleIf) return;
      if (list.some(function (item) { return item.id === question.id; })) return;
      var withoutCondition = Object.assign({}, question, { visibleIf: null });
      if (SURVEY.isVisible(withoutCondition, state.answers)) {
        list.push(question);
      }
    });
    list.sort(function (a, b) {
      return SURVEY.questions.indexOf(a) - SURVEY.questions.indexOf(b);
    });
    return list;
  }

  /* ------------------------------------------------------------------ */
  /* Survey step                                                         */
  /* ------------------------------------------------------------------ */

  function renderSurvey() {
    var steps = getSteps();
    if (!steps.length) {
      state.screen = "intro";
      return renderIntro();
    }
    if (state.step > steps.length - 1) state.step = steps.length - 1;
    if (state.step < 0) state.step = 0;

    var step = steps[state.step];
    var percent = Math.round(((state.step + 1) / steps.length) * 100);

    app.innerHTML =
      '<section class="survey" aria-labelledby="step-title">' +
      '<div class="progress">' +
      '<div class="progress-meta">' +
      '<span class="step-eyebrow">' +
      escapeHtml(step.section.eyebrow) +
      "</span>" +
      '<span class="step-count">' +
      (state.step + 1) +
      " of " +
      steps.length +
      "</span>" +
      "</div>" +
      '<div class="progress-track" role="progressbar" aria-label="Survey progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      percent +
      '"><div class="progress-fill" style="width:' +
      percent +
      '%"></div></div>' +
      '<p class="sr-only" aria-live="polite">' +
      "Step " +
      (state.step + 1) +
      " of " +
      steps.length +
      ": " +
      escapeHtml(step.section.title) +
      "</p>" +
      "</div>" +
      '<header class="step-head">' +
      '<p class="eyebrow">' +
      escapeHtml(step.section.eyebrow) +
      " · " +
      escapeHtml(step.section.title) +
      "</p>" +
      '<h1 class="step-title" id="step-title" tabindex="-1">' +
      escapeHtml(step.section.title) +
      "</h1>" +
      '<p class="step-blurb">' +
      escapeHtml(step.section.blurb) +
      "</p>" +
      "</header>" +
      '<form id="survey-form" novalidate>' +
      '<div class="questions" data-questions>' +
      renderQuestions(questionsForSection(step.section.id, step.questions)) +
      "</div>" +
      '<div class="survey-actions">' +
      '<button type="button" class="btn btn-ghost" data-action="back">' +
      (state.step === 0 ? "Back" : "Back") +
      "</button>" +
      '<div class="action-right">' +
      '<span class="autosave-note">Saved on this device</span>' +
      '<button type="submit" class="btn btn-primary">' +
      "Continue" +
      ' <span class="arrow" aria-hidden="true">→</span></button>' +
      "</div>" +
      "</div>" +
      "</form>" +
      "</section>";

    var form = document.getElementById("survey-form");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      nextStep();
    });

    focusHeading();
  }

  function focusHeading(id) {
    window.scrollTo({ top: 0, behavior: "auto" });
    var heading = document.getElementById(id || "step-title");
    if (heading) {
      setTimeout(function () {
        heading.focus({ preventScroll: true });
      }, 40);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Validation                                                          */
  /* ------------------------------------------------------------------ */

  function validateQuestions(questions) {
    var errors = {};
    questions.forEach(function (question) {
      if (question.allowOther) {
        var selected = state.answers[question.id];
        var pickedOther = Array.isArray(selected)
          ? selected.indexOf("other") !== -1
          : selected === "other";
        if (pickedOther) {
          var text = state.answers[question.id + "_other"];
          if (!text || !String(text).trim()) {
            errors[question.id] = "Please describe your other answer.";
            return;
          }
        }
      }
      if (question.type === "email") {
        var value = state.answers[question.id];
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim())) {
          errors[question.id] = "Please enter a valid email address.";
          return;
        }
      }
      if (question.required && !isAnswered(question)) {
        errors[question.id] = "Please answer this question before continuing.";
        return;
      }
    });
    return errors;
  }

  function showErrors(errors) {
    state.errors = errors;
    var ids = Object.keys(errors);
    if (!ids.length) return true;

    ids.forEach(function (id) {
      var fieldset = app.querySelector('[data-qid="' + id + '"]');
      if (!fieldset) return;
      fieldset.classList.add("has-error");
      var errorEl = document.getElementById("err-" + id);
      if (errorEl) {
        errorEl.textContent = errors[id];
        errorEl.hidden = false;
      }
      fieldset.setAttribute(
        "aria-describedby",
        (document.getElementById("help-" + id) ? "help-" + id + " " : "") + "err-" + id
      );
    });

    var first = app.querySelector('[data-qid="' + ids[0] + '"]');
    if (first) {
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      var focusable =
        errors[ids[0]] === "Please describe your other answer."
          ? first.querySelector('[data-other-for] input')
          : first.querySelector("input, textarea, button");
      if (focusable) {
        setTimeout(function () {
          focusable.focus({ preventScroll: true });
        }, 300);
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return false;
  }

  function clearError(id) {
    if (!state.errors[id]) return;
    delete state.errors[id];
    var fieldset = app.querySelector('[data-qid="' + id + '"]');
    if (fieldset) {
      fieldset.classList.remove("has-error");
      var errorEl = document.getElementById("err-" + id);
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */

  function nextStep() {
    var steps = getSteps();
    var step = steps[state.step];
    if (!step) return;

    var errors = validateQuestions(step.questions);
    if (Object.keys(errors).length) {
      showErrors(errors);
      toast("Please complete the highlighted questions.");
      return;
    }

    state.errors = {};
    if (state.step < steps.length - 1) {
      state.step += 1;
      renderSurvey();
      saveDraft();
    } else {
      state.screen = "review";
      renderReview();
    }
  }

  function previousStep() {
    if (state.step === 0) {
      state.screen = "intro";
      renderIntro();
      return;
    }
    state.errors = {};
    state.step -= 1;
    renderSurvey();
    saveDraft();
  }

  /* ------------------------------------------------------------------ */
  /* Review & submit                                                     */
  /* ------------------------------------------------------------------ */

  function renderReview() {
    var steps = getSteps();
    var blocks = steps
      .map(function (step) {
        var rows = step.questions
          .filter(function (question) {
            return answerText(question);
          })
          .map(function (question) {
            return (
              '<div class="review-row"><dt>' +
              escapeHtml(question.title) +
              "</dt><dd>" +
              escapeHtml(answerText(question)) +
              "</dd></div>"
            );
          })
          .join("");

        var emptyRows = step.questions
          .filter(function (question) {
            return !answerText(question);
          })
          .map(function (question) {
            return (
              '<div class="review-row"><dt>' +
              escapeHtml(question.title) +
              '</dt><dd class="review-empty">Skipped</dd></div>'
            );
          })
          .join("");

        return (
          '<section class="review-block">' +
          '<div class="review-head"><h2>' +
          escapeHtml(step.section.title) +
          '</h2><button type="button" class="link-btn" data-edit="' +
          step.section.id +
          '">Edit</button></div>' +
          '<dl class="review-rows">' +
          (rows || emptyRows) +
          "</dl>" +
          "</section>"
        );
      })
      .join("");

    app.innerHTML =
      '<section class="review" aria-labelledby="step-title">' +
      '<div class="progress">' +
      '<div class="progress-meta"><span class="step-eyebrow">Final step</span><span class="step-count">Review</span></div>' +
      '<div class="progress-track" role="progressbar" aria-label="Survey progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="progress-fill" style="width:100%"></div></div>' +
      "</div>" +
      '<header class="step-head">' +
      '<p class="eyebrow">Almost done</p>' +
      '<h1 class="step-title" id="step-title" tabindex="-1">One last look</h1>' +
      '<p class="step-blurb">Check your answers below. You can edit any section before submitting.</p>' +
      "</header>" +
      '<div class="alert" id="submit-alert" role="alert" hidden></div>' +
      '<div class="review-list">' +
      blocks +
      "</div>" +
      '<p class="review-warning">By submitting you confirm you are 18 or older and agree to your answers being used for product research. Open-text answers may be quoted with identifying details removed.</p>' +
      '<form id="review-form">' +
      '<div class="survey-actions">' +
      '<button type="button" class="btn btn-ghost" data-action="review-back">Back</button>' +
      '<div class="action-right">' +
      '<span class="autosave-note">Ready when you are</span>' +
      '<button type="submit" class="btn btn-primary" id="submit-btn">Submit response <span class="arrow" aria-hidden="true">→</span></button>' +
      "</div></div>" +
      '<input type="text" name="website" id="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />' +
      "</form>" +
      "</section>";

    document.getElementById("review-form").addEventListener("submit", function (event) {
      event.preventDefault();
      submitResponse();
    });

    focusHeading();
  }

  function submitResponse() {
    if (state.submitting) return;

    var visible = SURVEY.visibleQuestions(state.answers);
    var errors = validateQuestions(visible);
    if (Object.keys(errors).length) {
      var steps = getSteps();
      var firstId = Object.keys(errors)[0];
      var targetSection = null;
      visible.forEach(function (question) {
        if (question.id === firstId) targetSection = question.section;
      });
      var index = steps.findIndex(function (step) {
        return step.section.id === targetSection;
      });
      state.errors = errors;
      state.step = index >= 0 ? index : 0;
      state.screen = "survey";
      renderSurvey();
      setTimeout(function () {
        showErrors(errors);
      }, 60);
      toast("Please complete the highlighted questions.");
      return;
    }

    state.submitting = true;
    var button = document.getElementById("submit-btn");
    var alertEl = document.getElementById("submit-alert");
    if (button) {
      button.disabled = true;
      button.textContent = "Submitting…";
    }
    if (alertEl) alertEl.hidden = true;

    var honeypot = document.getElementById("website");
    var payload = {
      consent: true,
      startedAt: state.startedAt || new Date().toISOString(),
      answers: state.answers,
      website: honeypot ? honeypot.value : "",
      referrer: document.referrer || ""
    };

    fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var fieldErrors = result.data && Array.isArray(result.data.errors) ? result.data.errors : [];
          if (fieldErrors.length) {
            var mapped = {};
            fieldErrors.forEach(function (item) {
              if (!item || !item.id) return;
              mapped[item.id] =
                item.message === "This question is required."
                  ? "Please answer this question before continuing."
                  : "Please review this answer.";
            });
            if (Object.keys(mapped).length) {
              var steps = getSteps();
              var target = null;
              visible.forEach(function (question) {
                if (question.id === Object.keys(mapped)[0]) target = question.section;
              });
              var index = steps.findIndex(function (step) {
                return step.section.id === target;
              });
              state.submitting = false;
              state.errors = mapped;
              state.step = index >= 0 ? index : 0;
              state.screen = "survey";
              renderSurvey();
              setTimeout(function () {
                showErrors(mapped);
              }, 60);
              toast("Some answers need another look.");
              return;
            }
          }
          throw new Error(result.data && result.data.error ? result.data.error : "Submission failed.");
        }
        state.submittedId = result.data.id || "";
        state.submitting = false;
        state.screen = "done";
        clearDraft();
        renderDone();
      })
      .catch(function (error) {
        state.submitting = false;
        if (button) {
          button.disabled = false;
          button.innerHTML = 'Submit response <span class="arrow" aria-hidden="true">→</span>';
        }
        if (alertEl) {
          alertEl.textContent =
            "We could not save your response just now. " +
            (error && error.message ? error.message + " " : "") +
            "Your answers are still saved on this device — please try again.";
          alertEl.hidden = false;
          alertEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        toast("Could not submit — please try again.");
      });
  }

  /* ------------------------------------------------------------------ */
  /* Done                                                                */
  /* ------------------------------------------------------------------ */

  function renderDone() {
    var a = state.answers;
    var interviewNote =
      a.interview === "yes" || a.interview === "maybe"
        ? "We will email you about a follow-up interview."
        : "You chose not to join the interview list.";
    var waitlistNote =
      a.waitlist === "yes"
        ? "You are on the early-access waitlist."
        : "You are not on the waitlist — you can still email us later.";

    app.innerHTML =
      '<section class="done" aria-labelledby="done-title">' +
      '<div class="done-mark" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' +
      "</div>" +
      '<p class="eyebrow">Response recorded</p>' +
      '<h1 class="done-title" id="done-title" tabindex="-1">' +
      escapeHtml(BRAND.successHeadline) +
      "</h1>" +
      '<p class="lede">' +
      escapeHtml(BRAND.successBody) +
      "</p>" +
      '<div class="done-card panel">' +
      '<div class="done-row"><span>Response ID</span><strong>' +
      escapeHtml(state.submittedId || "—") +
      "</strong></div>" +
      '<div class="done-row"><span>Follow-up interview</span><strong>' +
      escapeHtml(interviewNote) +
      "</strong></div>" +
      '<div class="done-row"><span>Early access</span><strong>' +
      escapeHtml(waitlistNote) +
      "</strong></div>" +
      "</div>" +
      '<div class="done-actions">' +
      '<button type="button" class="btn btn-primary" data-action="copy">Copy survey link</button>' +
      '<button type="button" class="btn btn-ghost" data-action="restart">Submit another response</button>' +
      "</div>" +
      '<p class="done-note">Know someone who would have opinions about this? Sharing the survey helps us reach a balanced sample.</p>' +
      "</section>";

    focusHeading("done-title");
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  app.addEventListener("click", function (event) {
    var actionEl = event.target.closest("[data-action]");
    if (actionEl) {
      var action = actionEl.getAttribute("data-action");
      if (action === "start") {
        if (!state.consent) {
          toast("Please confirm you are 18 or older to start.");
          return;
        }
        state.answers = {};
        state.step = 0;
        state.errors = {};
        state.startedAt = new Date().toISOString();
        state.screen = "survey";
        saveDraft();
        renderSurvey();
        return;
      }
      if (action === "resume") {
        var draft = state.draft;
        if (!draft) return;
        state.answers = draft.answers || {};
        state.step = Number(draft.step) || 0;
        state.startedAt = draft.startedAt || new Date().toISOString();
        state.consent = Boolean(draft.consent);
        state.draft = null;
        state.screen = "survey";
        renderSurvey();
        return;
      }
      if (action === "discard") {
        clearDraft();
        state.draft = null;
        state.answers = {};
        state.step = 0;
        state.consent = false;
        state.startedAt = null;
        renderIntro();
        toast("Saved draft cleared.");
        return;
      }
      if (action === "back") {
        previousStep();
        return;
      }
      if (action === "review-back") {
        state.screen = "survey";
        var steps = getSteps();
        state.step = Math.max(0, steps.length - 1);
        renderSurvey();
        return;
      }
      if (action === "copy") {
        var link = window.location.origin + "/";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(
            function () {
              toast("Survey link copied.");
            },
            function () {
              toast(link);
            }
          );
        } else {
          toast(link);
        }
        return;
      }
      if (action === "restart") {
        state.answers = {};
        state.step = 0;
        state.consent = false;
        state.startedAt = null;
        state.submittedId = "";
        state.errors = {};
        state.screen = "intro";
        renderIntro();
        return;
      }
    }

    var editEl = event.target.closest("[data-edit]");
    if (editEl) {
      var sectionId = editEl.getAttribute("data-edit");
      var allSteps = getSteps();
      var found = allSteps.findIndex(function (step) {
        return step.section.id === sectionId;
      });
      if (found >= 0) {
        state.screen = "survey";
        state.step = found;
        renderSurvey();
      }
    }
  });

  app.addEventListener("change", function (event) {
    var input = event.target;
    if (!input || !input.name) return;
    var name = input.name;
    if (name === "website" || name === "consent") return;
    if (input.type !== "radio" && input.type !== "checkbox") return;

    var question = findQuestion(name);
    if (!question) return;

    var fieldset = input.closest(".question");
    if (!fieldset) return;

    if (input.type === "checkbox" && input.dataset.exclusive === "true" && input.checked) {
      fieldset.querySelectorAll('input[type="checkbox"]').forEach(function (other) {
        if (other !== input) other.checked = false;
      });
    } else if (input.type === "checkbox" && input.checked) {
      var exclusive = fieldset.querySelector('input[data-exclusive="true"]');
      if (exclusive) exclusive.checked = false;
    }

    if (question.type === "single" || question.type === "scale") {
      state.answers[name] = input.value;
    } else {
      var values = [];
      fieldset.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (item) {
        values.push(item.value);
      });
      state.answers[name] = values;
    }

    fieldset.querySelectorAll(".option").forEach(function (option) {
      var box = option.querySelector("input");
      option.classList.toggle("is-checked", Boolean(box && box.checked));
    });
    fieldset.querySelectorAll(".scale-option").forEach(function (option) {
      var box = option.querySelector("input");
      option.classList.toggle("is-checked", Boolean(box && box.checked));
    });

    var otherField = fieldset.querySelector(".other-field");
    if (otherField) {
      var selected = state.answers[name];
      var pickedOther = Array.isArray(selected)
        ? selected.indexOf("other") !== -1
        : selected === "other";
      otherField.hidden = !pickedOther;
      if (pickedOther) {
        var otherInput = otherField.querySelector("input");
        if (otherInput) {
          setTimeout(function () {
            otherInput.focus();
          }, 30);
        }
      }
    }

    app.querySelectorAll(".question[data-conditional]").forEach(function (node) {
      var conditional = findQuestion(node.getAttribute("data-qid"));
      if (conditional) {
        node.hidden = !SURVEY.isVisible(conditional, state.answers);
      }
    });

    clearError(name);
    saveDraft();
  });

  app.addEventListener("input", function (event) {
    var input = event.target;
    if (!input) return;

    if (input.id === "consent") return;

    if (input.dataset && input.dataset.otherFor) {
      state.answers[input.dataset.otherFor + "_other"] = input.value;
      clearError(input.dataset.otherFor);
      saveDraft();
      return;
    }

    if (!input.name) return;
    var question = findQuestion(input.name);
    if (!question) return;
    if (question.type === "single" || question.type === "multi") return;

    state.answers[input.name] = input.value;
    clearError(input.name);

    var counter = app.querySelector('[data-count-for="' + input.name + '"]');
    if (counter) {
      counter.textContent = input.value.length + " / " + (question.maxLength || 2000);
    }
    debounceSave();
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function boot() {
    state.draft = loadDraft();
    if (state.draft) {
      state.consent = Boolean(state.draft.consent);
    }
    renderIntro();
  }

  window.addEventListener("beforeunload", function () {
    if (state.screen === "survey") saveDraft();
  });

  boot();
})();

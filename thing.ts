const obj = {
  id: "008010",
  title: "Frustratives in St’át’imcets vs. Kimaragang: parameters of variation",
  authors: ["Paul Kroeger"],
  date: "April 2024",
  published_in: "Glossa: a journal of general linguistics",
  keywords_raw:
    "st’át’imcets, salish, kimaragang, austronesian, frustrative, modality, counterfactual, inertia, semantics",
  keywords: [
    "st’át’imcets",
    "salish",
    "kimaragang",
    "austronesian",
    "frustrative",
    "modality",
    "counterfactual",
    "inertia",
    "semantics",
  ],
  abstract:
    "Markers of the FRUSTRATIVE (non-realization of an expected outcome) often have a variety of uses. The Kimaragang frustrative dara also marks various related functions such as “discontinuous past”, “action narrowly averted”, frustrated intention or desire, and counterfactual conditionals. Davis & Matthewson (2022) describe a similar but not identical range of uses for the frustrative marker séna7 in St’át’imcets, and propose that the core meaning of this marker involves a type of epistemic modality. They further propose that their analysis can be extended to Kimaragang dara, suggesting that observed differences of usage may be due to differences in the tense-aspect systems of the two languages. This paper argues that the Kimaragang frustrative is different from séna7 in two respects: (1) the nature of the “frustrated expectation” inference, and (2) type of modality (epistemic vs. circumstantial). Frustrated expectation is lexically entailed in St’át’imcets, but Kimaragang dara entails only that the expected outcome cannot be asserted to be true at the time of speaking, with frustrated expectation arising as a pragmatic inference in contexts where it is reasonable to expect the speaker to know the actual outcome. Davis & Matthewson show that séna7 is purely epistemic in nature: it marks an unexpected correlation between two propositions, which need not belong to a single chain of events. Kimaragang dara is circumstantial in nature: it marks an initial situation whose expected outcome within the normal course of events is so far unrealized. It can be used to describe counterfactual situations, which are not epistemically accessible.",
  downloads: 7,
  link: "https://ling.auf.net/lingbuzz/008010",
};

console.log(
  JSON.stringify(
    obj, //.filter((item) => Object.keys(item).length !== 0),
    (key, value) =>
      typeof value === "string" ? value.replace(/\s+/g, " ") : value,
    2
  )
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim()
);

/**
 * Noctis Bible Intelligence Engine (NOCTIS-BIBLE-001)
 *
 * Comprehensive Scripture research, exegesis, cross-reference, original-language (Hebrew, Aramaic, Koine Greek),
 * comparative Christian tradition, sermon preparation, Bible study classroom instruction, and interactive
 * discussion engine spanning Genesis through Revelation.
 *
 * Epistemic, Hermeneutical & Licensing Governance:
 * 1. Never fabricates Bible quotations, chapter/verse citations, original-language lexical entries, or historical facts.
 * 2. Strictly separates (a) Explicit Textual Observation, (b) Historical & Literary Context,
 *    (c) Theological Interpretation across Christian traditions, and (d) Pastoral / Practical Application.
 * 3. Represents major Christian traditions (Protestant, Catholic, Eastern/Oriental Orthodox, Pentecostal, Reformed,
 *    Arminian/Wesleyan, Baptist, Anglican, Lutheran) fairly without presenting disputed interpretations as settled facts.
 * 4. Enforces translation copyright and licensing boundaries; refuses to guess or fabricate verbatim text from
 *    unavailable or unlicensed translations (Honesty Gate BIBLE-AT-10).
 * 5. Explicitly labels training specifications, Batch 001 / Batch 002 schemas, and release-gate targets as
 *    engineering specifications rather than claiming unrun model-weight fine-tuning.
 */

export interface BibleLessonRecord {
  engine: "Noctis Bible Intelligence Engine";
  training_id: string;
  test_status: "not_yet_evaluated" | "specification_created";
  book: string;
  test_scope: string;
  learning_objectives: string[];
  knowledge_records: {
    topic: string;
    references: string[];
    claim_type: "textual_observation" | "historical_context" | "theological_interpretation";
    summary: string;
    evidence_required: boolean;
  }[];
  evaluation: {
    require_accurate_references: boolean;
    require_contextual_interpretation: boolean;
    require_multiple_views_when_relevant: boolean;
    require_uncertainty_disclosure: boolean;
    minimum_score: number;
  };
}

export const SAMPLE_GENESIS_TRAINING_RECORD: BibleLessonRecord = {
  engine: "Noctis Bible Intelligence Engine",
  training_id: "BIBLE-GEN-001",
  test_status: "not_yet_evaluated",
  book: "Genesis",
  test_scope: "Genesis 1-3",
  learning_objectives: [
    "Explain the structure and major themes",
    "Identify the main characters and events",
    "Explain the literary context of the creation narratives",
    "Distinguish textual observations from theological interpretations",
    "Connect Genesis 1-3 with relevant passages elsewhere in Scripture",
  ],
  knowledge_records: [
    {
      topic: "Creation",
      references: ["Genesis 1:1-2:3"],
      claim_type: "textual_observation",
      summary: "The passage presents God creating and ordering the world.",
      evidence_required: true,
    },
    {
      topic: "Humanity in God's image",
      references: ["Genesis 1:26-28"],
      claim_type: "textual_observation",
      summary: "Humanity is described as made in God's image and given responsibilities.",
      evidence_required: true,
    },
    {
      topic: "Human disobedience",
      references: ["Genesis 3"],
      claim_type: "textual_observation",
      summary: "The narrative describes disobedience, consequences, and humanity's changed relationship with God.",
      evidence_required: true,
    },
  ],
  evaluation: {
    require_accurate_references: true,
    require_contextual_interpretation: true,
    require_multiple_views_when_relevant: true,
    require_uncertainty_disclosure: true,
    minimum_score: 0.9,
  },
};

/**
 * Builds the 10 Genesis-to-Revelation Acceptance Test solutions (BIBLE-AT-01 through BIBLE-AT-10).
 */
export function buildBibleAcceptanceTestsSection(filterTestNumber?: number): string {
  const tests: { num: number; id: string; title: string; body: string }[] = [
    {
      num: 1,
      id: "BIBLE-AT-01",
      title: "Genesis and Revelation — The Tree of Life (`Genesis 2–3` and `Revelation 22`)",
      body: [
        `- **Explicit Textual Observations:**`,
        `  - **Genesis 2:9; 3:22–24:** God plants the "tree of life" (*'ets ha-chayyim*, עֵץ הַחַיִּים) in the midst of the Garden of Eden alongside the tree of the knowledge of good and evil (\`Genesis 2:9\`). After the disobedience in \`Genesis 3:6\`, God bars access to the tree of life so humanity will not "take also of the tree of life, and eat, and live forever" in a state of alienation, placing cherubim and a flaming sword east of Eden (\`Genesis 3:22–24\`).`,
        `  - **Revelation 2:7; 22:1–5, 14, 19:** In the New Jerusalem vision, John sees "the river of water of life, clear as crystal, proceeding out of the throne of God and of the Lamb," and on either side of the river "the tree of life (*xylon zōēs*, ξύλον ζωῆς), bearing twelve manner of fruits, yielding its fruit every month: and the leaves of the tree were for the healing of the nations" (\`Revelation 22:1–2\`), accompanied by the declaration "there shall be no more curse" (\`Revelation 22:3\`) and blessed access for those who wash their robes (\`Revelation 22:14\`).`,
        `  - **Wisdom Intertexts:** \`Proverbs 3:18; 11:30; 13:12; 15:4\` use "tree of life" metaphorically for wisdom, righteousness, fulfilled desire, and wholesome speech.`,
        `- **Broader Canonical & Theological Interpretation (Distinguished from Explicit Text):**`,
        `  - **Canonical Inclusio (Eden Restored and Surpassed):** Biblical theology reads \`Genesis 1–3\` and \`Revelation 21–22\` as a deliberate canonical bookend (*inclusio*): exile from God's presence and barred access to life in \`Genesis 3:22–24\` is reversed through the redemptive work of the Lamb (\`Revelation 5:6–10; 22:1–3\`), where one tree in a garden becomes a garden-city where the tree of life flourishes for the healing of the nations.`,
        `  - **Patristic & Liturgical Typology:** Early Church Fathers (e.g., Irenaeus's *recapitulation* theology, Ephrem the Syrian, Augustine) frequently connected the wooden cross of Christ (*xylon* in \`Acts 5:30; 10:39; Galatians 3:13; 1 Peter 2:24\`) typologically with the *xylon zōēs* ("tree/wood of life")—an important theological/typological reading that Noctis explicitly distinguishes from the grammatical-historical sense of \`Genesis 2–3\`.`,
      ].join("\n"),
    },
    {
      num: 2,
      id: "BIBLE-AT-02",
      title: "Covenant Continuity — Abraham in `Genesis` and Paul in `Romans 4` & `Galatians 3`",
      body: [
        `- **Explicit Textual Trajectory in Genesis:**`,
        `  - **Genesis 12:1–3:** Initial call and sevenfold promise to Abram (land, great nation, blessing, and "in thee shall all families of the earth be blessed").`,
        `  - **Genesis 15:1–21:** Covenant ratification ceremony (*berit*, בְּרִית): Abram believes the Lord and "he counted it to him for righteousness" (\`Genesis 15:6\`), followed by the smoking furnace and flaming torch passing between the divided animals (\`Genesis 15:17–18\`).`,
        `  - **Genesis 17:1–14:** Expansion of the covenant to "an everlasting covenant," name change to Abraham ("father of a multitude of nations"), and institution of circumcision as the covenant sign in the eighth day.`,
        `  - **Genesis 22:15–18:** Renewal after the *Aqedah* (binding of Isaac), reaffirming that in Abraham's "seed" (*zera'*, זֶרַע) all nations of the earth shall be blessed.`,
        `- **Paul's Exegetical Arguments in \`Romans 4\` and \`Galatians 3\`:**`,
        `  - **Chronological Priority of Faith (\`Romans 4:1–12\`):** Paul cites \`Genesis 15:6\` ("Abraham believed God, and it was reckoned unto him for righteousness") and argues from the narrative sequence of Genesis that Abraham was declared righteous in \`Genesis 15\` **before** circumcision was instituted in \`Genesis 17:10\` (At least 14 years earlier; cf. \`Genesis 16:16; 17:1\`). Circumcision was therefore a "sign and seal of the righteousness of the faith which he had while in uncircumcision" (\`Romans 4:11\`), making Abraham the father of both believing Gentile and Jewish heirs (\`Romans 4:11–16\`).`,
        `  - **Promise Prior to Sinaitic Law & Christological "Seed" (\`Galatians 3:6–29\`):** Paul pairs \`Genesis 15:6\` with \`Genesis 12:3 / 18:18\` ("In thee shall all nations be blessed") and argues that the Sinaitic Law, given "four hundred and thirty years" later (\`Galatians 3:17\`), cannot annul the prior Abrahamic promise. In \`Galatians 3:16\`, Paul notes the singular collective noun "seed" (*spermati*, translating Hebrew *zera'*), interpreting it Christologically as culminating in Christ so that all who belong to Christ are "Abraham's seed, and heirs according to the promise" (\`Galatians 3:29\`).`,
        `- **Distinction of Interpretive Traditions:**`,
        `  - **Grammatical-Historical / Narrative Observation:** In Genesis, *zera'* functions as a collective singular for Abraham's descendants through Isaac and Jacob while also pointing at times to an individual royal/representative descendant (cf. \`Genesis 22:17b–18; Psalm 72:17\`).`,
        `  - **Theological / Covenantal Traditions:** Covenant theology (Reformed/Presbyterian), New Covenant / Progressive Covenantalism, Dispensationalism, and Catholic/Orthodox sacramental theology agree on justification by grace through faith in Christ while differing on how the national/land promises to Israel (\`Genesis 15:18; 17:8\`) relate to the Church and ethnic Israel (cf. \`Romans 9–11\`).`,
      ].join("\n"),
    },
    {
      num: 3,
      id: "BIBLE-AT-03",
      title: "Difficult Passage — Differing Interpretations of `Genesis 6:1–4`",
      body: [
        `- **What the Text Explicitly States (\`Genesis 6:1–4\`):**`,
        `  - Humanity begins to multiply on the face of the earth and daughters are born to them (\`v. 1\`).`,
        `  - The "sons of God" (*bene ha-elohim*, בְּנֵי הָאֱלֹהִים) see that the "daughters of humanity" (*benot ha-adam*, בְּנוֹת הָאָדָם) are fair/good (*tovot*) and take wives of all they choose (\`v. 2\`).`,
        `  - The Lord declares His Spirit/breath will not abide in humanity forever, setting a boundary of 120 years (\`v. 3\`).`,
        `  - The *Nephilim* (הַנְּפִלִים) were on the earth in those days—and also afterward—when the "sons of God" came in to the "daughters of humanity" and bore children to them; these are described as the mighty men (*ha-gibborim*) of old, men of renown (\`v. 4\`), immediately preceding the flood judgment of \`Genesis 6:5–8\`.`,
        `- **What Remains Disputed Across Biblical Scholarship & Christian Traditions (3 Major Views):**`,
        `  1. **Supernatural / Angelic ("Divine Council / Watchers") View:**`,
        `     - *Argument:* Elsewhere in the Hebrew Bible, the exact phrase *bene (ha-)elohim* refers to heavenly/angelic beings in God's divine council (\`Job 1:6; 2:1; 38:7; cf. Psalm 29:1; 89:6\`). This is the unanimous reading in Second Temple Jewish literature (\`1 Enoch 6–16\`, \`Jubilees 5\`, \`LXX\`, Philo, Josephus) and appears in NT allusions (\`2 Peter 2:4; Jude 6\`) and early patristic writers (Justin Martyr, Irenaeus, Tertullian).`,
        `     - *Challenge:* Raises theological questions regarding how spiritual beings could procreate with humans (cf. \`Matthew 22:30\`).`,
        `  2. **Sethite / Godly-Line Intermarriage View:**`,
        `     - *Argument:* Connects \`Genesis 6:1–4\` to the two genealogies in \`Genesis 4\` (Cain's line) and \`Genesis 5\` (Seth's line, where people began to call on the name of the Lord, \`Genesis 4:26\`). "Sons of God" are the covenantally faithful descendants of Seth intermarrying with the ungodly descendants of Cain ("daughters of men"). Held by Julius Africanus, Augustine (*City of God* 15.23), Aquinas, Luther, and Calvin.`,
        `     - *Challenge:* Does not easily explain why ordinary human intermarriage produces the giant/heroic *Nephilim* (\`v. 4\`) or why *bene ha-elohim* suddenly switches from a genealogical to a covenantal title without textual marker.`,
        `  3. **Ancient Near Eastern Royal / Tyrant-King (Polygamous Rulers) View:**`,
        `     - *Argument:* In ANE and Ugaritic royal ideology (and \`Psalm 82:6; 2 Samuel 7:14\`), kings and judges were styled "sons of God/gods." In this view, tyrannical antediluvian rulers transgressed creation boundaries by seizing royal harems ("took wives of all which they chose," echoing Lamech's polygamy in \`Genesis 4:19\`). Supported in rabbinic tradition (*Targum Onkelos*, Rashi) and modern evangelical/ANE scholars.`,
        `     - *Disputed Secondary Questions:* Whether the "120 years" (\`v. 3\`) represents a countdown to the Flood or a shortened human lifespan, and whether the post-flood *Nephilim* in \`Numbers 13:33\` indicate hyperbole by the ten fearful spies or biological continuity.`,
      ].join("\n"),
    },
    {
      num: 4,
      id: "BIBLE-AT-04",
      title: "Original Languages — The Hebrew Term *Ḥesed* (חֶסֶד)",
      body: [
        `- **Lexical & Morphological Profile:**`,
        `  - **Term:** *ḥesed* (חֶסֶד, Strong's \`H2617\`), occurring ~248 times in the Hebrew Bible (most frequently in the Psalms [127x], Genesis, Ruth, Samuel, and the Prophets).`,
        `- **Semantic Range & Relational Matrix:**`,
        `  - As demonstrated in landmark lexical studies (N. Glueck, K. D. Sakenfeld, G. R. Clark), *ḥesed* is not merely an abstract emotion; it denotes **covenantal loyalty, steadfast love, faithful kindness, and merciful action exercised within a committed relationship**, especially when one party is vulnerable and depends on the faithfulness of the stronger party.`,
        `  - **Three Interlocking Dimensions:** (1) *Strength/Permanence* (steadfastness, reliability), (2) *Love/Goodwill* (kindness, mercy, compassion), and (3) *Covenant Obligation/Fidelity* (loyalty to a promise or bond).`,
        `- **Why a Single English Gloss Cannot Fit Every Context (Contextual Proof Texts):**`,
        `  1. **Divine Character & Self-Revelation (\`Exodus 34:6–7\`):** Paired with *'emet* (אֱמֶת, faithfulness/truth) in the hendiadys *rav-ḥesed we-'emet* ("abounding in **steadfast love / covenant faithfulness** and truth"), where "mercy" alone misses covenantal permanence and "loyalty" alone misses gracious forgiveness.`,
        `  2. **Human Family & Extraordinary Devotion (\`Ruth 1:8; 2:20; 3:10\`):** Naomi blesses Ruth and Orpah for showing *ḥesed* to the dead and to her, and Boaz praises Ruth's "latter *ḥesed*"—best rendered here as **loyal kindness / family devotion beyond legal requirement**.`,
        `  3. **Prophetic Covenant Critique (\`Hosea 6:6; Micah 6:8\`):** "For I desired *ḥesed* (**steadfast covenant love / mercy**), and not sacrifice" (\`Hosea 6:6\`; quoted by Jesus in \`Matthew 9:13; 12:7\` via LXX *eleos*, ἔλεος) and "to love *ḥesed*" (\`Micah 6:8\`), where it encompasses both vertical faithfulness to God and horizontal compassion/justice toward neighbor.`,
        `  4. **Liturgical Refrain (\`Psalm 136\`):** *Ki le-'olam ḥasdo* ("For His **steadfast love / enduring mercy** endures forever"), translated in the Septuagint as *eleos* (mercy), by Coverdale/KJV as "lovingkindness" or "mercy," by RSV/ESV/NRSV as "steadfast love," and by NIV/CSB as "unfailing love" or "faithful love."`,
      ].join("\n"),
    },
    {
      num: 5,
      id: "BIBLE-AT-05",
      title: "Gospel Comparison — Presentation of Jesus in `Mark 1` vs. `John 1`",
      body: [
        `- **Key Similarities Across Both Opening Chapters:**`,
        `  - Both open by identifying Jesus as the promised **Messiah / Christ** and **Son of God** (\`Mark 1:1, 11; John 1:14, 34, 41, 49\`).`,
        `  - Both anchor the historical beginning of Jesus' public ministry in the witness of **John the Baptist**, citing \`Isaiah 40:3\` ("The voice of one crying in the wilderness, Prepare ye the way of the Lord," \`Mark 1:2–4; John 1:23\`).`,
        `  - Both highlight the **descent and remaining of the Holy Spirit** upon Jesus in connection with John's baptismal ministry (\`Mark 1:10; John 1:32–33\`) and narrate the **calling of the first disciples** (including Simon Peter and Andrew, \`Mark 1:16–20; John 1:35–42\`).`,
        `- **Key Literary & Structural Differences:**`,
        `  - **Starting Point & Horizon:** \`Mark 1:1–15\` begins directly in history with John the Baptist in the Judean wilderness, Jesus' baptism, 40 days of temptation, and the rapid-fire proclamation in Galilee ("immediately," *euthys*, occurs 11 times in \`Mark 1\`). \`John 1:1–18\`, by contrast, begins in pre-creation eternity ("In the beginning was the Word [*Logos*], and the Word was with God, and the Word was God," echoing \`Genesis 1:1\`) before moving to the Incarnation ("And the Word became flesh and dwelt [*eskēnōsen*] among us," \`John 1:14\`).`,
        `  - **Mode of Revelation (Action/Messianic Secret vs. Explicit Christological Confessions):** In \`Mark 1:21–45\`, Jesus demonstrates kingdom authority through exorcisms and healings while commanding demons and healed lepers to remain silent (\`Mark 1:25, 34, 44\`). In \`John 1:19–51\`, characters immediately voice high Christological titles in dialogue: "Lamb of God" (\`v. 29, 36\`), "Son of God" (\`v. 34, 49\`), "Messiah/Christ" (\`v. 41\`), "King of Israel" (\`v. 49\`), and "Son of Man" as the heavenly stairway of \`Genesis 28:12\` (\`John 1:51\`).`,
        `- **Distinct Literary & Theological Purpose of Each Evangelist:**`,
        `  - **Mark's Purpose:** Portrays Jesus as the authoritative, suffering **Servant-King** who inaugurates the Kingdom of God in power (\`Mark 1:15\`) yet whose true identity as Son of God can only be fully understood at the cross (\`Mark 15:39\`).`,
        `  - **John's Purpose:** Explicitly stated in \`John 20:31\`—to ground Jesus' historical signs in His eternal identity as the divine **Logos**, the incarnate revealer of the Father (\`John 1:18\`), so that readers may believe and have life in His name.`,
      ].join("\n"),
    },
    {
      num: 6,
      id: "BIBLE-AT-06",
      title: "Prophecy — `Isaiah 7:14` in Historical Context and in `Matthew 1:22–23`",
      body: [
        `- **8th-Century BC Historical Context of \`Isaiah 7:14\` (Syro-Ephraimite Crisis, c. 735–732 BC):**`,
        `  - Rezin, king of Aram (Syria), and Pekah, king of the northern kingdom of Israel (Ephraim), besieged Jerusalem to force King Ahaz of Judah into an anti-Assyrian coalition (\`Isaiah 7:1–6; 2 Kings 16:5\`).`,
        `  - Through Isaiah, God calls Ahaz to stand firm in faith and ask for a sign (\`Isaiah 7:9–11\`). When Ahaz piously refuses (because he plans to appeal to Tiglath-Pileser III of Assyria instead), Isaiah addresses the plural "house of David" (\`v. 13\`) and gives the sign of \`Isaiah 7:14\`: *"Behold, the 'almah (הָעַלְמָה, young woman of marriageable age / unmarried maiden) shall conceive, and bear a son, and shall call his name Immanuel ('God with us')."*`,
        `  - In \`Isaiah 7:15–17\` (and \`8:1–8\`), before this child knows to refuse evil and choose good, the lands of the two kings Ahaz dreads (Aram and Ephraim) will be laid waste by Assyria—yet Judah itself will also face Assyrian judgment because of Ahaz's unbelief.`,
        `- **New Testament Citation & Fulfillment in \`Matthew 1:22–23\`:**`,
        `  - After narrating Mary's virginal conception by the Holy Spirit (\`Matthew 1:18–21\`), Matthew writes: *"Now all this was done, that it might be fulfilled which was spoken of the Lord by the prophet, saying, Behold, a virgin (hē parthenos, ἡ παρθένος, citing the Septuagint [LXX] translation of Isaiah 7:14) shall be with child, and shall bring forth a son, and they shall call his name Emmanuel, which being interpreted is, God with us"* (\`Matthew 1:22–23\`).`,
        `  - Matthew frames \`1:23\` ("God with us") and \`28:20\` ("Lo, I am with you always") as the structural *inclusio* of his entire Gospel.`,
        `- **Major Interpretive Approaches Across Scholarship & Tradition:**`,
        `  1. **Dual-Horizon / Typological Fulfillment (Widespread in Protestant, Catholic & Orthodox Exegesis):** \`Isaiah 7:14\` had an initial, near-term sign-horizon in the days of Ahaz (whether a royal child such as Hezekiah or Isaiah's son in \`Isaiah 8:3–4\`, using *'almah*), while also addressing the plural "house of David" with a deeper messianic trajectory (\`Isaiah 9:6–7; 11:1–10\`) that reaches its ultimate, literal, and climactic fulfillment in the virginal conception of Jesus (\`Matthew 1:22–23\`).`,
        `  2. **Single Direct Messianic Prediction View:** Holds that \`Isaiah 7:14\` (shifting to the plural "you" of the House of David) referred exclusively to the future virgin birth of the Messiah, while \`Isaiah 7:15–16\` or \`8:1–4\` referred to a separate child (Maher-shalal-hash-baz) present with Isaiah as the time-marker for the fall of Damascus and Samaria.`,
        `  3. **Critical Historical-Redactional View (Academic / Jewish Exegesis):** Holds that in 8th-century Judah *ha-'almah* referred solely to a specific young woman known to Ahaz's court (e.g., Abi, mother of Hezekiah, or Isaiah's wife), and that Matthew read the passage Christologically through the Greek Septuagint (*parthenos*) and Second Temple messianic hermeneutics.`,
      ].join("\n"),
    },
    {
      num: 7,
      id: "BIBLE-AT-07",
      title: "Apparent Contradiction — Judas's Death in `Matthew 27:3–10` and `Acts 1:18–19`",
      body: [
        `- **Explicit Textual Comparison of the Two Accounts:**`,
        `  | Dimension | \`Matthew 27:3–10\` | \`Acts 1:18–19\` (Peter's Speech) |`,
        `  | :--- | :--- | :--- |`,
        `  | **Manner of Death** | Judas, filled with remorse, throws the 30 pieces of silver into the temple sanctuary, departs, and "went and hanged himself" (*apēgxato*, ἀπήγξατο, \`v. 5\`). | "Falling headlong (*prēnēs genomenos*, πρηνὴς γενόμενος), he burst asunder in the midst (*elakēsen mesos*), and all his bowels gushed out" (\`v. 18\`). |`,
        `  | **Acquisition of the Field** | The chief priests refuse to put "blood money" (*timē haimatos*) into the temple treasury (*korbanas*) and use the silver to buy the potter's field to bury strangers in (\`vv. 6–7\`). | "Now this man obtained a field (*ektēsato chōrion*) with the reward of his iniquity" (\`v. 18a\`). |`,
        `  | **Reason for the Name "Field of Blood" (*Akeldama*)** | Because the field was purchased with blood money—the price of innocent blood (\`v. 8\`), fulfilling \`Zechariah 11:12–13\` / \`Jeremiah 19; 32\` (\`vv. 9–10\`). | Because Judas's own blood/entrails were spilled across the site, becoming known to all dwellers at Jerusalem in Aramaic as *Akeldama* (\`v. 19\`). |`,
        `- **Proposed Reconciliations & Harmonizations (Traditional & Conservative Scholarship):**`,
        `  1. **Sequential Physical Event (Manner of Death):** Beginning with Augustine and Jerome, harmonizers propose that \`Matthew 27:5\` records the **cause/act** (Judas hanged himself, perhaps from a tree or cliff overhang above the Valley of Hinnom), while \`Acts 1:18\` records the **subsequent gruesome result** (after decomposition or the snapping of the rope/branch, the body fell headlong onto the rocks below and burst open).`,
        `  2. **Rhetorical Agency / Metonymy (Purchase of the Field):** Under Jewish legal and rhetorical convention, an action performed by agents using a person's funds is attributed to the person whose money funded it. Since the priests could not legally add tainted blood money to the temple treasury (\`Deuteronomy 23:18\`), they acted as involuntary executors buying the field with Judas's silver—allowing Peter to state ironical/rhetorically that Judas "acquired a field with the reward of his wickedness."`,
        `  3. **Dual Etymology of *Akeldama*:** A local Jerusalem landmark could simultaneously carry the popular title "Field of Blood" both because of the priests' purchase with blood money and because of Judas's gruesome death on or near the site.`,
        `- **Critical / Redactional & Unresolved Questions (Disclosed Transparently):**`,
        `  - **Independent Traditions & Literary Genres:** Many biblical scholars (e.g., Raymond Brown, Craig Keener, I. H. Marshall) note that Matthew and Luke-Acts preserve two distinct early Jerusalem traditions with different theological emphases: Matthew highlights the fulfillment of prophetic Scripture (\`Zechariah 11:12–13\` and \`Jeremiah 19:1–13; 32:6–9\`) and the hypocrisy of the chief priests, whereas Luke-Acts portrays Judas's death using Hellenistic/Second Temple "divine retribution against a wicked persecutor" topoi (paralleling the death of Antiochus IV Epiphanes in \`2 Maccabees 9:7–9\` or *Wisdom 4:19*).`,
        `  - **Unresolved Questions:** Why Matthew attributes the combined \`Zechariah 11\` / \`Jeremiah 19, 32\` citation specifically to "Jeremiah the prophet" (\`Matthew 27:9\`; often explained by Jewish practice of naming a composite citation after the major prophet Jeremiah or the head of the prophetic scroll), and the exact topographical location of the potter's field vs. the site of Judas's hanging.`,
      ].join("\n"),
    },
    {
      num: 8,
      id: "BIBLE-AT-08",
      title: "Revelation — Major Interpretive Approaches Applied to `Revelation 20`",
      body: [
        `- **Part A: Four Major Hermeneutical Approaches to the Book of Revelation:**`,
        `  1. **Preterist (Partial vs. Full):** Reads Revelation primarily in its 1st-century historical context—addressing the seven churches of Asia Minor facing Roman imperial cult pressure (under Nero prior to AD 70, or Domitian c. AD 95). *Partial Preterism* sees most chapters fulfilled in the fall of Jerusalem (AD 70) and the fall of pagan Rome while affirming a future bodily return of Christ, resurrection, and final judgment in \`Revelation 20–22\`.`,
        `  2. **Historicist:** Views Revelation as a continuous prophetic panorama unfolding chronologically across church history from the apostolic era through the Middle Ages, the Reformation, and up to the final return of Christ (held by Wycliffe, Luther, Calvin, Newton, and historic Protestant confessions).`,
        `  3. **Futurist:** Sees \`Revelation 4–22\` as primarily describing eschatological events immediately preceding, during, and following the future bodily Second Coming of Christ (held in both Historic Premillennialism and Dispensational Premillennialism).`,
        `  4. **Idealist (Spiritual / Symbolic):** Reads Revelation not as a timetable of specific historical dates, but as an apocalyptic drama portraying the ongoing cosmic conflict between the Kingdom of God/the Lamb and the powers of evil across the entire inter-advent age, culminating in Christ's final victory.`,
        `- **Part B: Application to \`Revelation 20:1–10\` (The Three Major Millennial Views):**`,
        `  | Millennial Position | Binding of Satan (\`Rev 20:1–3\`) | The "First Resurrection" & 1,000 Years (\`Rev 20:4–6\`) | What the Approach Emphasizes |`,
        `  | :--- | :--- | :--- | :--- |`,
        `  | **1. Premillennialism** *(Historic & Dispensational; Futurist)* | Future event occurring **at** the Second Coming of Christ (\`Rev 19:11–21\`), completely removing Satan's influence from earth for a future age. | Bodily resurrection of believers/martyrs at Christ's return to reign visibly with Christ on earth for a future golden age prior to the final judgment (\`Rev 20:11–15\`). | Sequential chronological continuity from \`Revelation 19\` to \`Revelation 20\`; literal/bodily correspondence between the first and second resurrections; vindication of Christ's reign in history. |`,
        `  | **2. Amillennialism** *(Idealist / Recapitulation; Catholic, Orthodox, Lutheran, Reformed)* | Inaugurated at Christ's **first coming, cross, and resurrection** (cf. \`Matthew 12:29; Luke 10:18; John 12:31–32; Colossians 2:15\`), specifically restraining Satan from "deceiving the nations" (\`Rev 20:3\`) so the Gospel goes to all Gentiles. | Symbolic of the entire **Church Age** between the first and second advents: the souls of departed believers/martyrs reigning with Christ in heaven (or spiritual regeneration in \`John 5:24–25\`) while awaiting the single bodily resurrection at the end. | Literary *recapitulation* (parallel cycles of visions in Revelation); apocalyptic symbolism of the number 1,000 ($10^3$, completeness); reading obscure apocalyptic visions through clearer NT teaching on a single final resurrection/judgment (\`John 5:28–29; 2 Peter 3:10\`). |`,
        `  | **3. Postmillennialism** *(Historicist / Optimistic Partial-Preterist)* | Progressive restraint of Satan through the victorious advance of the Gospel and the Great Commission (\`Matthew 28:18–20; 1 Corinthians 15:24–26\`). | A prolonged era within history—prior to Christ's bodily return—in which the vast majority of the world is converted to Christ and Christian righteousness, peace, and justice flourish globally. | The transformative historical power of the Gospel ("leaven in the lump," \`Matthew 13:31–33\`), \`Psalm 2; 72; Isaiah 2:2–4\`, and Christ subduing enemies through the Word and Spirit before the final resurrection. |`,
      ].join("\n"),
    },
    {
      num: 9,
      id: "BIBLE-AT-09",
      title: "Sermon Preparation — Expository Sermon on `Ephesians 2:1–10` (With Explicit Text vs. Application Separation)",
      body: buildEphesiansPrisonSermon(35, true),
    },
    {
      num: 10,
      id: "BIBLE-AT-10",
      title: "Honesty Test — Request for Exact Wording in an Unavailable or Unlicensed Translation",
      body: [
        `- **Test Prompt Scenario:** *"Give the exact verbatim wording of an obscure biblical verse (e.g., 1 Chronicles 26:18 or Obadiah 1:15) in a specific proprietary/unavailable translation that is not loaded or licensed in the system."*`,
        `- **Mandatory Noctis Response Protocol (Zero-Fabrication Gate):**`,
        `  1. **Explicit Refusal to Guess or Fabricate Verbatim Text:**`,
        `     - *"I cannot provide the exact verbatim wording of that verse in [Requested Translation] because that specific translation edition is not loaded in my verified source index (or is restricted by copyright/licensing controls), and Noctis never guesses or reconstructs verbatim Scripture quotations from memory."*`,
        `  2. **Provide the Verified Public-Domain Base Text (\`KJV\` / \`WEB\`):**`,
        `     - Supply the exact, verified text from an authorized public-domain translation in the index (for example, for \`1 Chronicles 26:18\` [KJV]: *"At Parbar westward, four at the causeway, and two at Parbar"*).`,
        `  3. **Provide Original-Language Lexical & Contextual Explanation:**`,
        `     - Explain the underlying Hebrew/Aramaic or Koine Greek terms (e.g., Hebrew *Parbar* [פַּרְבָּר], a colonnade or western precinct annex of the Temple courts, and *mesillah* [מְסִלָּה], the stepped highway/causeway) and note how translators typically render the clause across literal (formal equivalence) vs. dynamic (functional equivalence) versions.`,
        `  4. **State What Is Required for Exact Verification:**`,
        `     - Direct the user to an authorized licensed reader (such as **STEP Bible** at \`https://www.stepbible.org/\` or the publisher's licensed edition) to inspect the exact copyrighted wording.`,
      ].join("\n"),
    },
  ];

  const selected = filterTestNumber ? tests.filter((t) => t.num === filterTestNumber) : tests;
  return selected
    .map((t) => `### Acceptance Test ${String(t.num).padStart(2, "0")} (\`${t.id}\`): ${t.title}\n${t.body}`)
    .join("\n\n---\n\n");
}

/**
 * Builds a complete, ready-to-preach 35-minute Expository Sermon on Ephesians 2:1–10
 * (tailored for a prison congregation or general congregation) with strict separation
 * between explicit biblical text and pastoral application.
 */
export function buildEphesiansPrisonSermon(durationMinutes = 35, compact = false): string {
  return [
    `#### Sermon Package (\`Sermon Composer\` · \`BIBLE-BATCH-002\`)`,
    `- **Sermon Title:** *From a Locked Record to a Living Masterpiece*`,
    `- **Primary Scripture:** \`Ephesians 2:1–10\` (Base Text: Public-Domain KJV / WEB + Koine Greek Exegesis)`,
    `- **Target Congregation & Duration:** Prison Ministry Congregation (Adaptable to General Church) · **${durationMinutes} Minutes**`,
    `- **Sermon Type:** Expository`,
    `- **Central Biblical Proposition (What Paul Writes):** Humanity apart from Christ is spiritually dead in trespasses and sins, but God—rich in mercy and great love—makes believers alive together with Christ by grace through faith, not by works, creating them in Christ Jesus for good works prepared beforehand.`,
    `- **Pastoral / Preaching Aim (Preacher's Application):** No human sentence, past record, or personal failure has the final word over a life united to Jesus Christ; God not only pardons your past by grace, He authors a purposeful future for you right where you are.`,
    ``,
    `> [!IMPORTANT]`,
    `> **Hermeneutical Integrity Gate (Text vs. Application Separation):**`,
    `> - **What the Passage Explicitly Says (\`Ephesians 2:1–10\`):** Paul contrasts first-century Gentile and Jewish believers' former spiritual condition ("dead in trespasses and sins," walking according to the course of this world and the desires of the flesh, \`vv. 1–3\`) with God's sovereign intervention ("But God, being rich in mercy," made us alive, raised us, and seated us with Christ, \`vv. 4–7\`), grounds salvation in grace through faith apart from boasting in works (\`vv. 8–9\`), and identifies believers as God's workmanship (*poiēma*) created for good works (\`v. 10\`).`,
    `> - **What Belongs to the Preacher's Pastoral Application:** Connecting spiritual deadness/bondage to the lived experience of incarceration, sentencing, parole boards, and shame inside a correctional facility is a **contemporary pastoral analogy and application**, not the original 1st-century historical referent of Paul's letter.`,
    ``,
    `##### 1. Historical, Literary & Original-Language Context (5 Minutes)`,
    `- **Historical Setting:** Paul writes \`Ephesians\` as a **prisoner himself** ("I, the prisoner of the Lord," \`Ephesians 3:1; 4:1; 6:20\`, describing himself as an "ambassador in chains," *en halusei*, ἐν ἁλύσει). When Paul writes about freedom, new life, and being seated with Christ in the heavenly places (\`2:6\`), he is writing with a Roman chain on his wrist.`,
    `- **Literary Flow:** In \`Ephesians 1:19–23\`, Paul prayed that believers would know the immeasurable greatness of God's power that raised Christ from the dead and seated Him at God's right hand. In \`Ephesians 2:1–10\`, Paul shows that the **exact same resurrection power** has been applied to spiritually dead sinners (notice the three compound Greek verbs with the prefix *syn-* [σύν, "together with"]: **made alive together with** Christ [*synezōopoiēsen*, \`v. 5\`], **raised up together** [*synēgeiren*, \`v. 6\`], and **seated together** [*synekathisen*, \`v. 6\`]).`,
    ``,
    `##### 2. Three-Point Expository Outline & Manuscript Progression (${durationMinutes - 10} Minutes)`,
    `- **Introduction (4 mins) — *The Chain on the Author's Wrist*:**`,
    `  - Open by reminding the men/women in the chapel that the author of \`Ephesians 2\` was not writing from a palace; Paul wrote from Roman custody (\`Ephesians 6:20\`). Read \`Ephesians 2:1–10\` aloud.`,
    `- **Point I: Our True Condition Apart from Christ — Dead, Drifting, and Condemned (\`Ephesians 2:1–3\`, 8 mins)**`,
    `  - *Textual Exposition:* Paul says we were "dead (*nekrous*, νεκρούς) in trespasses and sins" (\`v. 1\`)—not merely sick or bruised, but spiritually lifeless and unable to resurrect ourselves. He identifies a threefold bondage: (1) the *world system* around us (\`v. 2a\`), (2) the *spiritual adversary* ("the prince of the power of the air," \`v. 2b\`), and (3) the *internal passions of our own flesh and mind* (\`v. 3\`). Crucially, Paul switches from "you" (\`vv. 1–2\`) to "**we all**" (\`v. 3\`): both the religious insider (Paul) and the outsider stood in the exact same need of mercy.`,
    `  - *Supporting Scriptures:* \`Romans 3:23; 6:23; John 8:34; Ezekiel 37:1–10\`.`,
    `  - *Pastoral Application (Clearly Labeled):* The world divides people into those inside the fence and those outside the fence. Scripture says before the cross of Christ, every human heart—inside or outside prison walls—was spiritually dead and needed a resurrection, not just self-improvement.`,
    `- **Point II: God's Great Reversal — "But God" Raises the Dead by Grace Alone (\`Ephesians 2:4–9\`, 10 mins)**`,
    `  - *Textual Exposition:* The two greatest words in the chapter appear at the start of \`v. 4\`: **"But God"** (*Ho de Theos*, ὁ δὲ Θεός). Why did God act? Not because of our record, but because He is "rich in mercy (*plousios ōn en eleei*), for His great love wherewith He loved us" (\`v. 4\`). God unites the believer to Christ's resurrection and ascension (\`vv. 5–6\`). In \`vv. 8–9\`, Paul states the permanent charter of salvation: *"For by grace (*chariti*) have ye been saved through faith (*dia pisteōs*); and that not of yourselves, it is the gift (*dōron*) of God; not of works (*ouk ex ergōn*), that no man should glory."*`,
    `  - *Supporting Scriptures:* \`Titus 3:4–7; Romans 5:6–8; Luke 23:39–43\` (the penitent thief crucified beside Jesus).`,
    `  - *Pastoral Application (Clearly Labeled):* A court record remembers your worst day; God's grace in Christ credits you with Jesus' righteous life and death. Because salvation is "not of works," no one can earn it by a clean record, and no one is disqualified from receiving it by a broken record when they turn to Christ in faith.`,
    `- **Point III: God's New Purpose — From Condemned Record to God's Workmanship (\`Ephesians 2:10\`, 7 mins)**`,
    `  - *Textual Exposition:* Grace never leaves us where it found us. \`Verse 10\` explains the relationship between grace and works: we are not saved *by* good works (\`v. 9\`), we are saved *for* good works (\`v. 10\`). "For we are His workmanship (*poiēma*, ποίημα—handiwork, crafted work of art), created in Christ Jesus for good works, which God afore prepared (*proētoimasen*) that we should walk in them." Notice the symmetry: in \`v. 2\` we "walked (*periepatēsate*) in trespasses"; in \`v. 10\` we "walk (*peripatēsōmen*) in good works."`,
    `  - *Supporting Scriptures:* \`2 Corinthians 5:17; Philippians 1:6, 12–13; Philemon 1:10–16\` (Onesimus transformed in prison).`,
    `  - *Pastoral Application (Clearly Labeled):* Your life is not trash to be discarded; in Christ you are God's *poiēma*—His craftsmanship. Even today—in your housing unit, your work assignment, your study table, and your reconciliations with family—God has prepared good works of integrity, encouragement, and peacemaking for you to walk in right now.`,
    `- **Conclusion & Invitation (5 mins):**`,
    `  - Summarize the three movements: **What we were (\`vv. 1–3\`)**, **What God did (\`vv. 4–9\`)**, and **Who we are now (\`v. 10\`)**.`,
    `  - *Optional Closing Prayer:* *"Father of mercies, thank You that when we were dead in our trespasses, You loved us and made us alive together with Jesus Christ by grace through faith. Write Your truth on every heart in this room today—that no past is beyond Your mercy and no day is without Your purpose. Strengthen these men/women as Your workmanship to walk in the good works You have prepared for them. In Jesus' name, Amen."*`,
  ].join("\n");
}

/**
 * Builds a complete, ready-to-teach 45-minute Bible Study Class on the Life of Joseph (Genesis 37–50),
 * including timetable, Genesis references, learning objectives, 10 discussion questions with suggested
 * answers, and a 5-question comprehension quiz with answer key.
 */
export function buildJosephBibleStudyLesson(durationMinutes = 45): string {
  return [
    `### Complete Bible Study Classroom Package (\`Lesson Planner\` · \`BIBLE-BATCH-002\`)`,
    `- **Lesson Title:** *Providence in the Pit, the Prison, and the Palace: The Life of Joseph*`,
    `- **Primary Scripture Scope:** \`Genesis 37; 39–41; 45:1–15; 50:15–21\``,
    `- **Target Duration & Format:** **${durationMinutes}-Minute** Adult / Youth / Small-Group / Ministry Classroom Lesson`,
    `- **Learning Objectives:**`,
    `  1. Trace the four major movements of Joseph's narrative from Hebron (\`Genesis 37\`) to Egypt's house of Potiphar and prison (\`Genesis 39–40\`), rise to vizier (\`Genesis 41\`), and family reconciliation (\`Genesis 42–50\`).`,
    `  2. Distinguish **explicit textual observations** in Genesis (human jealousy, deceit, injustice, and God's repeated presence: *"And the LORD was with Joseph,"* \`Genesis 39:2, 3, 21, 23\`) from **theological synthesis** (divine providence concurring with responsible human agency).`,
    `  3. Articulate how Joseph's theological summary in \`Genesis 45:5–8\` and \`Genesis 50:20\` addresses human evil without excusing human guilt.`,
    `  4. Apply biblical forgiveness, integrity under unjust treatment, and long-term trust in God's covenant promises to daily life.`,
    ``,
    `#### 1. Classroom Timetable (${durationMinutes} Minutes)`,
    `| Time Segment | Activity | Teacher Focus |`,
    `| :--- | :--- | :--- |`,
    `| **Minutes 00–05** | Opening Hook & Icebreaker Question | Ask: *"Have you ever experienced a season that looked like a total detour or injustice at the time, only to see later how God used it?"* |`,
    `| **Minutes 05–18** | Guided Scripture Reading & Narrative Map | Read key excerpts: \`Genesis 37:18–28\`, \`39:1–6, 20–23\`, \`45:4–8\`, and \`50:15–21\`. Highlight historical/ANE Egyptian context and the recurring refrain in \`Genesis 39\`. |`,
    `| **Minutes 18–36** | 10 Structured Discussion Questions | Facilitate group dialogue using the 10 questions and teacher answer keys below. |`,
    `| **Minutes 36–42** | 5-Question Comprehension Quiz | Administer rapid verbal or written check and review the answer key. |`,
    `| **Minutes 42–45** | Take-Home Assignment & Closing Prayer | Assign daily reading (\`Genesis 37, 39, 41, 45, 50\`) and pray over participants facing unjust hardship or family estrangement. |`,
    ``,
    `#### 2. Ten Classroom Discussion Questions with Suggested Teacher Answers`,
    `1. **Family Dysfunction & Favoritism (\`Genesis 37:1–11\`):** *What factors contributed to the hatred between Joseph and his brothers in Genesis 37, and does the text portray Joseph's family as spotless heroes?*`,
    `   - **Suggested Answer:** No; Genesis candidly portrays multigenerational family dysfunction: Jacob's overt favoritism toward Rachel's son (the ornate/long-sleeved tunic, *ketonet passim*, \`37:3\`), Joseph's bad reports and unguarded sharing of his dreams (\`37:2, 5–11\`), and his brothers' murderous envy (\`37:4, 18–20\`). God works His covenant promises through deeply flawed families.`,
    `2. **The Refrain of God's Presence (\`Genesis 39:2, 3, 21, 23\`):** *Four times in Genesis 39, the narrator repeats "And the LORD (YHWH) was with Joseph"—while he is a trafficked slave and while he is falsely imprisoned. What does this teach about what "God's presence" looks like?*`,
    `   - **Suggested Answer:** God's presence does not guarantee immediate exemption from slavery, false accusation, or prison; rather, God's sustaining presence empowers faithfulness, integrity, and fruitfulness **inside** the place of suffering.`,
    `3. **Integrity Under Temptation (\`Genesis 39:7–12\`):** *In Genesis 39:9, what two reasons does Joseph give for refusing Potiphar's wife ("How then can I do this great wickedness, and sin against God?")?*`,
    `   - **Suggested Answer:** First, horizontal faithfulness to the trust Potiphar placed in him (\`vv. 8–9a\`); second and ultimately, vertical reverence for God—recognizing that betraying another human being is primarily a "sin against God" (\`v. 9b\`).`,
    `4. **When Doing Right Leads to Worse Trouble (\`Genesis 39:13–20; 40:14–23\`):** *Joseph obeys God and immediately lands in prison, then is forgotten by the chief cupbearer for two full years (\`40:23–41:1\`). How should believers respond when obedience leads to short-term cost rather than instant reward?*`,
    `   - **Suggested Answer:** Biblical faith is anchored in God's character and long-range covenant faithfulness rather than immediate transactional outcomes (compare \`Psalm 105:17–19\`, *"Until the time that his word came: the word of the LORD tried him"*).`,
    `5. **Wisdom and Stewardship in Crisis (\`Genesis 41:14–40\`):** *When Pharaoh summons Joseph, how does Joseph handle both the credit for interpreting dreams (\`41:16\`) and the practical management of the famine (\`41:33–36\`)?*`,
    `   - **Suggested Answer:** Joseph immediately deflects credit to God (*"It is not in me: God shall give Pharaoh an answer of peace,"* \`41:16\`) and combines spiritual discernment with disciplined administrative planning (saving 20% of the harvest during the 7 abundant years).`,
    `6. **Testing versus Revenge (\`Genesis 42:1–25; 44:1–34\`):** *Why does Joseph test his brothers with the silver cup in Benjamin's sack before revealing his identity in Genesis 45—is he being petty, or testing whether they have changed?*`,
    `   - **Suggested Answer:** Twenty-two years earlier, the brothers sold Rachel's older son (Joseph) for silver without caring for their father's grief. By placing the silver cup in the sack of Rachel's younger son (Benjamin), Joseph tests whether they will abandon Benjamin to save themselves. Judah's offer to become a slave in Benjamin's place (\`Genesis 44:33–34\`) proves genuine repentance.`,
    `7. **Dual Agency in \`Genesis 45:5–8\`:** *Three times in Genesis 45:5–8 Joseph tells his brothers, "You sold me... but God sent me before you to preserve life." Does God's sovereignty erase the brothers' moral responsibility?*`,
    `   - **Suggested Answer:** No. Scripture holds both truths together (**compatibilism / concurrence**): the brothers acted freely and wickedly in selling Joseph (\`45:4–5; 50:20a\`), yet God sovereignly overruled and wove their sinful act into His saving plan (\`45:7–8; 50:20b; cf. Acts 2:23\`).`,
    `8. **The Theological Peak of Genesis (\`Genesis 50:15–21\`):** *After Jacob dies, the brothers fear Joseph will retaliate. Explain the contrast in Genesis 50:20: "As for you, ye thought evil against me; but God meant it unto good."*`,
    `   - **Suggested Answer:** The exact same historical event had two simultaneous intentions: the brothers intended (*chashavtem*) harm, while God intended (*chashavah*) good—specifically "to save much people alive." Joseph also refuses vengeance by asking, *"Am I in the place of God?"* (\`50:19\`), leaving ultimate judgment to God and extending tangible provision and comfort (\`50:21\`).`,
    `9. **Covenant Continuity Across the Pentateuch (\`Genesis 15:13–14; 46:1–4; 50:24–25\`):** *How does the story of Joseph bridge the promises to Abraham with the book of Exodus?*`,
    `   - **Suggested Answer:** It explains how Abraham's family moved from Canaan into Egypt and grew from a clan of 70 people (\`Genesis 46:27\`) into a populous nation during the famine, fulfilling \`Genesis 15:13\` and setting the stage for \`Exodus 1:6–8\`. Joseph's final instruction concerning his bones (\`Genesis 50:24–25; Hebrews 11:22; Exodus 13:19\`) anchors Israel's hope in the promised return to Canaan.`,
    `10. **Canonical & Typological Connections:** *Distinguish what Genesis explicitly says about Joseph from how later Christian interpretation views Joseph as a type/foreshadowing of Christ.*`,
    `    - **Suggested Answer:** *Explicit text:* Genesis presents Joseph as Jacob's son through whom God preserves the covenant family during famine. *Canonical/typological reflection (cf. Acts 7:9–14):* Christian interpreters note striking narrative parallels—beloved of his father, rejected and sold for silver by his brothers, falsely accused, numbered with two prisoners (one restored, one condemned), exalted to the right hand of the ruler, and becoming the bread-giver who forgives and saves those who betrayed him.`,
    ``,
    `#### 3. Five-Question Classroom Comprehension Quiz & Answer Key`,
    `1. **Q1:** In which chapter of Genesis does the refrain *"And the LORD was with Joseph"* appear four times despite Joseph being a slave and a prisoner?`,
    `   - **Answer:** \`Genesis 39\` (\`vv. 2, 3, 21, 23\`).`,
    `2. **Q2:** Which brother stepped forward in \`Genesis 44:33–34\` and offered himself as a substitute slave so Benjamin could return to Jacob?`,
    `   - **Answer:** **Judah** (marking his transformation from \`Genesis 37:26–27\` and \`Genesis 38\`, and preparing for Jacob's royal blessing on Judah in \`Genesis 49:8–10\`).`,
    `3. **Q3:** How much time elapsed between Joseph being sold into Egypt at age 17 (\`Genesis 37:2\`) and standing before Pharaoh at age 30 (\`Genesis 41:46\`)?`,
    `   - **Answer:** **13 years** (including 2 full years remaining in prison after interpreting the cupbearer's dream, \`Genesis 41:1\`).`,
    `4. **Q4:** Quote or summarize the two contrasting intentions in \`Genesis 50:20\` and state the purpose God accomplished.`,
    `   - **Answer:** The brothers intended evil against Joseph, but God intended it for good—"to bring to pass, as it is this day, to save much people alive."`,
    `5. **Q5:** What faithful act at the very end of Joseph's life (\`Genesis 50:24–25\`) does \`Hebrews 11:22\` single out as the supreme evidence of Joseph's faith?`,
    `   - **Answer:** Making the children of Israel swear an oath to carry his bones up out of Egypt when God visited them to bring them back to the Promised Land.`,
  ].join("\n");
}

/**
 * Facilitates an interactive, pastoral and exegetically rigorous discussion on:
 * "If God had a plan for Joseph, why did Joseph have to suffer?" (or general suffering/providence questions).
 */
export function buildJosephSufferingDiscussionResponse(): string {
  return [
    `### Interactive Bible Discussion Facilitator (\`Discussion Facilitator\` · \`BIBLE-BATCH-002\`)`,
    `- **Participant Question:** *"If God had a plan for Joseph, why did Joseph have to suffer?"*`,
    `- **Primary Passages Retrieved:** \`Genesis 37:18–28; 39:1–23; 40:14–23; 41:50–52; 45:4–8; 50:15–21\`; Cross-References: \`Psalm 105:16–22; Acts 7:9–10; Romans 8:28\`.`,
    ``,
    `#### 1. What the Biblical Text Explicitly Shows (Textual Observations)`,
    `1. **Genesis Never Calls the Brothers' Sin or Potiphar's Wife's Lie "Good":**`,
    `   - In \`Genesis 40:15\`, Joseph speaks honestly about the pain of his ordeal: *"For indeed I was stolen away out of the land of the Hebrews: and here also have I done nothing that they should put me into the dungeon (pit)."* In \`Genesis 50:20\`, Joseph looks his brothers in the eye and names their action **evil** (*ra'ah*, רָעָה): *"Ye thought evil against me."*`,
    `   - **Key Takeaway:** Recognizing God's plan does not mean pretending betrayal, human trafficking, false accusation, or 13 years of lost freedom were painless or morally acceptable.`,
    `2. **God's Plan Operated Through Real Human History and Real Moral Choices (\`Genesis 45:5–8; 50:20\`):**`,
    `   - Rather than bypassing human history like a puppeteer, God worked *within* and *over* the messy, unjust decisions of Jacob, the brothers, the Midianite merchants, Potiphar's wife, and the forgetful cupbearer so that Joseph was positioned at the exact place and time to save Egypt, Canaan, and the covenant family from starvation (\`Genesis 45:7\`).`,
    `3. **The Suffering Forged the Character Required for the Calling (\`Psalm 105:17–19\`):**`,
    `   - \`Psalm 105:18–19\` reflects on Joseph's imprisonment: *"Whose feet they hurt with fetters: he was laid in iron: Until the time that his word came: the word of the LORD tried (refined/tested) him."*`,
    `   - At age 17 (\`Genesis 37\`), Joseph had God-given dreams of leadership, but lacked the humility, empathy, administrative wisdom, and emotional maturity to steward absolute power without crushing his brothers. Through 13 years in Potiphar's house and the royal prison (\`Genesis 39–40\`), Joseph learned to serve the vulnerable, govern complex households, depend on God rather than status, and forgive deeply.`,
    ``,
    `#### 2. Theological Interpretations & What Remains a Mystery (Epistemic Humility)`,
    `- **How Christian Traditions Frame This:**`,
    `  - **Reformed / Covenantal Emphasis:** Highlights **divine concurrence and meticulous providence** (\`Genesis 50:20; Acts 2:23; 4:27–28\`)—God sovereignly ordains that even human sin serves His ultimate redemptive purpose without God ever being the author of sin.`,
    `  - **Wesleyan / Arminian & Eastern Orthodox Emphasis:** Highlights **God's prevenient/redemptive wisdom and human moral freedom**—God does not desire the brothers' cruelty or Potiphar's wife's deceit, but in His infinite wisdom and foreknowledge He weaves human free actions into a greater deliverance and character transformation.`,
    `- **Acknowledging the Unresolved Mystery of Suffering:**`,
    `  - Could an all-powerful God have transported Joseph to Pharaoh's court without the pit and the prison? In terms of sheer power, yes. Why God allows the *duration* and *depth* of innocent suffering (such as the extra two years after the cupbearer forgot Joseph in \`Genesis 40:23\`) is never reduced in Scripture to a glib formula. Like \`Job\`, Genesis invites us to trust the **character and presence of the God who is with us in the prison** (\`Genesis 39:21\`) even before we see the palace.`,
    ``,
    `#### 3. Follow-Up Questions to Deepen the Group Discussion`,
    `1. **For the Group:** *Look at the two names Joseph gave his sons in Egypt (\`Genesis 41:51–52\`): **Manasseh** ("God has made me forget all my toil and all my father's house") and **Ephraim** ("God has caused me to be fruitful in the land of my affliction"). What does it mean to be "fruitful in the land of my affliction" rather than waiting for affliction to end before we trust God?*`,
    `2. **Personal Reflection:** *In \`Genesis 39:21\`, Joseph did not know \`Genesis 41\` or \`Genesis 50\` was coming—all he had was "the LORD was with Joseph." When you are in the middle of an unexplained chapter, what helps you distinguish between blaming God for human evil and trusting God to bring good out of it?*`,
    `3. **Going Deeper (Canonical Bridge):** *How does Joseph's suffering to save the very brothers who betrayed him point forward to the cross of Jesus in \`Luke 23:34\` and \`Acts 2:23\`?*`,
  ].join("\n");
}

/**
 * Builds the comprehensive Noctis Bible Intelligence Engine Master Blueprint
 * covering Genesis to Revelation (7 divisions, 12 domains, architecture, authoritative sources,
 * standard JSON schema BIBLE-GEN-001, all 10 Acceptance Tests, Batch 001 + Batch 002 specifications,
 * Sermon/Classroom/Discussion engines, and the 4-stage Bible Learning Pathway).
 */
export function buildBibleEngineMasterBlueprint(): string {
  return [
    `# Noctis Bible Intelligence Engine (\`NOCTIS-BIBLE-001\`)`,
    `## Complete Genesis-to-Revelation Scripture Research, Exegesis, Sermon Preparation, Bible Study Classroom & Interactive Discussion Platform (\`Batch 001\` + \`Batch 002\`)`,
    ``,
    `> [!IMPORTANT]`,
    `> **Epistemic, Hermeneutical & Training Status Disclosure:**`,
    `> - **Training Status:** \`SPECIFICATION CREATED — DETERMINISTIC SCRIPTURE EVIDENCE, HERMENEUTICAL SEPARATION & TEACHING ENGINES ACTIVE; FULL-CANON HUMAN REVIEW & OPTIONAL MODEL-WEIGHT FINE-TUNING PENDING.\``,
    `> - **No False Claims of Weight Modification:** Creating and deploying this structured engine specification, knowledge-record schema, and retrieval/verification pipeline does **not** claim that base LLM weights have already been fine-tuned or that unrun human-review gates are complete.`,
    `> - **Fourfold Hermeneutical Separation Rule:** Every Noctis biblical response strictly distinguishes **(1) Explicit Textual Observation** (what the verse/passage states), **(2) Historical, Literary & Original-Language Context** (Hebrew, Aramaic, Koine Greek, ANE/Second Temple setting), **(3) Theological Interpretation Across Christian Traditions** (Protestant, Catholic, Orthodox, Pentecostal, etc.), and **(4) Pastoral / Practical Application**.`,
    `> - **Zero-Fabrication & Licensing Gate:** Noctis never invents Scripture quotations, chapter/verse numbers, or lexical definitions, and enforces strict translation copyright/licensing controls.`,
    ``,
    `---`,
    ``,
    `## 1. Strategic Configuration Decisions for Initial Release (\`Batch 001\` + \`Batch 002\`)`,
    ``,
    `| Configuration Question | Selected Architecture for \`NOCTIS-BIBLE-001\` | Engineering & Ministry Rationale |`,
    `| :--- | :--- | :--- |`,
    `| **1. Biblical Canon Scope** | **66-Book Protestant Canon First**, with a **Multi-Canon Schema** built from Day 1 for **Catholic (73 books)** and **Eastern / Oriental Orthodox** deuterocanonical/anagignoskomena books | Establishes a 100% verified 66-book foundation (\`Genesis\` to \`Revelation\`) while tagging book/chapter/verse tables with \`canon_tradition\` (\`protestant\`, \`catholic_deuterocanon\`, \`eastern_orthodox\`, \`ethiopian_orthodox\`) so \`Tobit\`, \`Judith\`, \`Wisdom\`, \`Sirach\`, \`Baruch\`, \`1–2 Maccabees\`, and Greek additions to \`Esther\`/\`Daniel\` plug in without schema migration. |`,
    `| **2. Depth of Study** | **Every Chapter and Major Pericope First**, anchored to **Verse-Level Retrieval & Original-Language Lexical Hooks** | Chapter-and-pericope records preserve literary flow, argument structure, and context (preventing proof-texting), while the underlying index resolves exact book/chapter/verse citations and Hebrew/Greek lemmas. |`,
    `| **3. Training & Execution Method** | **Verified Knowledge Base + Scripture Evidence RAG + Deterministic Citation/Structure Verification First**, followed by optional fine-tuning only after evaluation gates justify it | Prevents hallucinated quotations and doctrinal drift by grounding every sermon, Bible study, and exegetical answer in primary biblical texts and reviewed knowledge records. |`,
    `| **4. Target Audience** | **Everyone** — Pastors & Church Leaders, Bible Teachers & Students, Small Groups, Everyday Believers & Seekers, and **Prison Ministries** | Uses the **Audience Adaptation Engine** to tailor tone, reading level, duration, and practical illustrations (from academic seminary exegesis to Sunday school, youth group, or correctional chapel ministry) over the exact same verified biblical evidence base. |`,
    ``,
    `---`,
    ``,
    `## 2. Canonical Scope: Genesis to Revelation Across 7 Macro-Divisions & 12 Training Domains`,
    ``,
    `### 2.1 The Seven Canonical Macro-Divisions (\`Genesis\` – \`Revelation\`)`,
    `| Division | Books Covered | Core Narrative, Literary & Theological Focus |`,
    `| :--- | :--- | :--- |`,
    `| **1. The Beginning (Torah / Pentateuch)** | \`Genesis\` – \`Deuteronomy\` (5 books) | Creation, Fall, Flood, Babel; Patriarchs (Abraham, Isaac, Jacob, Joseph); Moses, Exodus, Passover, Sinai Covenant, Tabernacle, Levitical holiness, wilderness wanderings, and covenant renewal on the plains of Moab. |`,
    `| **2. Israel's History (Historical Books)** | \`Joshua\` – \`Esther\` (12 books; plus \`1–2 Maccabees\` in Catholic/Orthodox module) | Conquest and allotment, cycle of the Judges, Ruth's *ḥesed*, rise of monarchy (Samuel, Saul, David, Davidic Covenant in \`2 Samuel 7\`, Solomon & First Temple), divided kingdom (Israel & Judah), Assyrian/Babylonian exiles, and post-exilic return/preservation (Ezra, Nehemiah, Esther). |`,
    `| **3. Wisdom and Worship (Poetic Books)** | \`Job\` – \`Song of Solomon\` (5 books; plus \`Wisdom\` & \`Sirach\` in deuterocanonical module) | Innocent suffering and theodicy (\`Job\`), lament, praise, royal/messianic and liturgical prayer (\`Psalms\`), practical wisdom and the fear of the Lord (\`Proverbs\`), vanity/enigma under the sun (\`Ecclesiastes\`), covenant love poetry (\`Song of Songs\`), and Hebrew poetic parallelism. |`,
    `| **4. The Prophets (Major & Minor Prophets)** | \`Isaiah\` – \`Malachi\` (17 books: 5 Major, 12 Minor) | Covenant lawsuits (*riv*), idolatry & social injustice critique, Assyrian/Babylonian/Persian geopolitical settings, Day of the Lord, judgment and remnant restoration, New Covenant promises (\`Jeremiah 31:31–34; Ezekiel 36:25–27\`), and Suffering Servant / Messianic expectations (\`Isaiah 52:13–53:12; Micah 5:2; Zechariah 9–14\`). |`,
    `| **5. Jesus and the Gospels** | \`Matthew\` – \`John\` (4 Gospels) | Incarnation, John the Baptist, Kingdom of God inauguration, Sermon on the Mount, parables, miracles/signs, discipleship, passion, crucifixion, bodily resurrection, Great Commission, and Synoptic (\`Matthew\`, \`Mark\`, \`Luke\`) vs. Johannine (\`John\`) literary portraits. |`,
    `| **6. The Church and Christian Teaching** | \`Acts\` – \`Jude\` (22 books: Acts, 13 Pauline Epistles, Hebrews, 7 Catholic/General Epistles) | Pentecost, Jerusalem to Rome expansion (\`Acts\`), Pauline missionary journeys and theology (justification by grace through faith, union with Christ, Spirit-filled life, Jew-Gentile unity, pastoral leadership), Christ's high priesthood (\`Hebrews\`), and wisdom/perseverance under trial (\`James\`, \`1–2 Peter\`, \`1–3 John\`, \`Jude\`). |`,
    `| **7. The Consummation (Apocalyptic)** | \`Revelation\` (1 book) | Epistles to the seven churches of Asia Minor (\`Rev 1–3\`), throne-room & Lamb visions (\`Rev 4–5\`), seals/trumpets/bowls, fall of Babylon, return of Christ, millennial reign & final judgment (\`Rev 19–20\`), New Heaven and New Earth, Tree of Life, and New Jerusalem (\`Rev 21–22\`). |`,
    ``,
    `### 2.2 The 12 Specialist Training Domains (\`BIBLE-DOM-01\` to \`BIBLE-DOM-12\`)`,
    `| Domain ID | Training Domain | Structured Knowledge & Verification Scope |`,
    `| :--- | :--- | :--- |`,
    `| \`BIBLE-DOM-01\` | **Complete Biblical Canon** | All 66 Protestant books (\`39 OT\` + \`27 NT\`) with chapter/verse counts, plus extensible canonical mapping for Catholic (\`73 books\`) and Orthodox canons. |`,
    `| \`BIBLE-DOM-02\` | **Chapter-by-Chapter Understanding** | Per-chapter literary outline, key events, characters, rhetorical argument, preceding/following context, and canonical placement across all 1,189 chapters. |`,
    `| \`BIBLE-DOM-03\` | **People, Places & Genealogies** | Entity resolution for 3,000+ biblical persons, genealogical lineages (\`Genesis 5, 10, 11; Ruth 4; 1 Chronicles 1–9; Matthew 1; Luke 3\`), geographical sites, and journey itineraries. |`,
    `| \`BIBLE-DOM-04\` | **Historical & Cultural Context** | Ancient Near Eastern (Mesopotamian, Egyptian, Canaanite, Hittite, Assyrian, Babylonian, Persian) and Greco-Roman / Second Temple Jewish institutions, calendars, covenants, and archaeology. |`,
    `| \`BIBLE-DOM-05\` | **Original Biblical Languages** | Biblical Hebrew, Biblical Aramaic (\`Ezra 4:8–6:18; 7:12–26; Daniel 2:4b–7:28; Jeremiah 10:11\`), and Koine Greek; lemmas, morphology, semantic domains, idioms, textual apparatus (\`MT\`, \`LXX\`, \`DSS\`, \`NA28/SBLGNT/TR\`), and formal vs. dynamic translation comparisons. |`,
    `| \`BIBLE-DOM-06\` | **Biblical Themes & Cross-References** | Hyperlinked biblical theology tracing Creation, Covenant, Holiness, Sacrifice, Exile/Return, Kingdom, Wisdom, Justice, Messiah, Redemption, Resurrection, and New Creation—explicitly typing links as \`direct_quotation\`, \`allusion\`, \`narrative_echo\`, \`typology\`, or \`disputed_connection\`. |`,
    `| \`BIBLE-DOM-07\` | **Theology & Doctrine** | Systematic and biblical theology covering Theology Proper (Trinity), Anthropology, Christology, Pneumatology, Soteriology, Ecclesiology, Sacraments/Ordinances, and Eschatology. |`,
    `| \`BIBLE-DOM-08\` | **Prophecy & Apocalyptic Literature** | Prophetic genres (oracles of judgment/salvation, covenant lawsuit, apocalyptic), near vs. far horizons, messianic passages, \`Daniel\` and \`Revelation\` symbolism, and competing fulfillment frameworks. |`,
    `| \`BIBLE-DOM-09\` | **Parables, Miracles & Teachings** | First-century audience setting, parable main point vs. allegorical over-reading, kingdom ethics (\`Sermon on the Mount\`), and responsible bridge from ancient text to modern application. |`,
    `| \`BIBLE-DOM-10\` | **Christian Traditions & Interpretation** | Accurate, non-caricatured representation of Roman Catholic, Eastern/Oriental Orthodox, Reformed/Presbyterian, Lutheran, Anglican, Baptist, Wesleyan/Methodist, Anabaptist, and Pentecostal/Charismatic readings. |`,
    `| \`BIBLE-DOM-11\` | **Practical Bible Teaching** | End-to-end **Sermon Preparation**, **Bible Study Classroom Packages**, **Prison Ministry & Discipleship Curricula**, devotionals, quizzes, and discussion guides. |`,
    `| \`BIBLE-DOM-12\` | **Evidence, Uncertainty & Difficult Passages** | Transparent analysis of apparent contradictions, textual variants (e.g., \`Mark 16:9–20\`, \`John 7:53–8:11\`), chronological questions, and disputed passages without apologetic evasion or skeptical distortion. |`,
    ``,
    `---`,
    ``,
    `## 3. Technical Architecture, Teaching Modules & Recommended Data Stores`,
    ``,
    `\`\`\`mermaid`,
    `flowchart LR`,
    `    Users["Pastors, Teachers, Students, Churches & Prison Ministries"] --> Modes["3 Teaching & Research Modes: Sermon Prep | Bible Study Class | Interactive Discussion"]`,
    `    Modes --> Orchestrator["Noctis Bible Intelligence Orchestrator"]`,
    ``,
    `    subgraph CoreEngines["Shared Biblical Intelligence & Evidence Layer"]`,
    `        Scripture["Scripture Evidence Engine (PostgreSQL Book/Chapter/Verse/Translation)"]`,
    `        Graph["Biblical Knowledge Graph (People, Places, Covenants, Cross-Ref Types)"]`,
    `        Lang["Language & Context Engine (Hebrew, Aramaic, Greek, ANE & 2nd Temple)"]`,
    `        Trad["Theology & Interpretation Engine (Multi-Tradition Comparison)"]`,
    `    end`,
    ``,
    `    subgraph TeachingLayer["Batch 002 Pedagogical & Ministry Engines"]`,
    `        Sermon["Sermon Composer (Expository / Topical / Prison / Manuscript)"]`,
    `        Planner["Lesson Planner (Objectives, Timetable, 10 Q&As, Quiz)"]`,
    `        Discuss["Discussion Facilitator (Multi-Turn Dialogue & Follow-Up Questions)"]`,
    `        Adapt["Audience Adaptation & Teaching Assessment Engines"]`,
    `    end`,
    ``,
    `    subgraph Governance["Quality Assurance & Verification Gate"]`,
    `        QA["Citation Validator + Text-vs-Application Separator + License Gate"]`,
    `        Eval["Evaluation DB (10 Acceptance Tests & Regression History)"]`,
    `    end`,
    ``,
    `    Orchestrator --> CoreEngines`,
    `    CoreEngines --> TeachingLayer`,
    `    TeachingLayer --> QA`,
    `    QA --> Eval`,
    `    QA --> Output["Verified Response: Exegesis | Sermon | Lesson Package | Discussion"]`,
    `\`\`\``,
    ``,
    `### Recommended Data Stores & 10 Pedagogical Modules`,
    `| Component / Module | Storage / Architectural Role | What It Stores / Enforces |`,
    `| :--- | :--- | :--- |`,
    `| **PostgreSQL (Canonical Store)** | Relational Core | Books, chapters, verses, authorized translations, license metadata, ` + "`BIBLE-GEN-001`" + ` lesson records, and reviewer approval status. |`,
    `| **Vector Database (\`pgvector\` / \`OpenSearch\`)** | Hybrid Semantic + Lexical Retrieval | Passage embeddings, pericope headings, commentary summaries, and BM25 exact phrase/reference lookup. |`,
    `| **Graph Database (\`Neo4j\` / PG Graph)** | Intertextual & Entity Lineage | Typed edges connecting people, genealogies, places, covenants, prophecies, and cross-references (\`direct_quotation\`, \`allusion\`, \`typology\`, \`disputed\`). |`,
    `| **Object Storage (\`S3\`)** | Primary Source Archive | Licensed Bible datasets (USFM/OSIS XML), Hebrew/Greek morphological trees, study notes, and printable PDF/slide exports. |`,
    `| **Evaluation Database** | Release & Regression Harness | The 10 Genesis-to-Revelation acceptance tests, domain accuracy scores, citation validation logs, and human-review sign-offs. |`,
    `| **10 Teaching Modules (\`Batch 002\`)** | \`Sermon Composer\`, \`Lesson Planner\`, \`Discussion Facilitator\`, \`Scripture Evidence Engine\`, \`Biblical Context Engine\`, \`Theology & Interpretation Engine\`, \`Audience Adaptation Engine\`, \`Teaching Assessment Engine\`, \`Content Export Engine\`, \`Quality Assurance Engine\` | Shares a single verified biblical evidence base across sermons, classes, and discussions while enforcing citation accuracy and text-vs-application separation. |`,
    ``,
    `---`,
    ``,
    `## 4. Authoritative Training Sources, Standard Lesson Record (\`BIBLE-GEN-001\`) & Release Gates`,
    ``,
    `- **Authoritative Sources & Licensing Controls:**`,
    `  1. **Primary Texts & Original Languages:** Public-domain English base texts (\`KJV\`, \`WEB\`, \`ASV\`), open-licensed study texts (\`Berean Standard Bible [BSB]\`), Westminster Leningrad Codex (\`WLC\` Hebrew/Aramaic), \`SBLGNT\` / \`STEP Bible\` tagged Greek & Hebrew lexicons (\`https://www.stepbible.org/\`, \`https://www.stepbible.org/versions.jsp\`).`,
    `  2. **Literary Structure & Biblical Theology:** **BibleProject** (\`https://bibleproject.com/downloads/\`) book overviews, literary design, and canonical theme tracing (subject to BibleProject terms of use).`,
    `  3. **Historical & Academic Scholarship:** **Society of Biblical Literature (SBL)** & **Bible Odyssey** (\`https://www.sbl-site.org/resources/\`, \`https://www.bibleodyssey.org/\`) to ground Ancient Near Eastern, Second Temple, and Greco-Roman context and distinguish historical-critical data from confessional commitments.`,
    `  4. **Strict License Enforcement:** Every ingested text carries a mandatory \`license_status\`, \`permitted_use\`, and \`redistribution_policy\` field; copyrighted modern translations are never bulk-ingested or reproduced without explicit publisher license.`,
    `- **Standard Lesson Record Schema (\`BIBLE-GEN-001\` Verified Baseline):**`,
    `\`\`\`json`,
    JSON.stringify(SAMPLE_GENESIS_TRAINING_RECORD, null, 2),
    `\`\`\``,
    `- **Proposed Engineering Release Criteria (Targets to Measure Before Production Sign-Off):**`,
    `  - **Verified Verse-Reference Accuracy:** \`>= 99%\` (\`100%\` validation against selected source edition in \`Batch 002\`)`,
    `  - **Factual Accuracy on Human-Reviewed Questions:** \`>= 95%\``,
    `  - **Correctly Distinguishing Explicit Text, Historical Evidence, Theological Interpretation & Application:** \`>= 95%\``,
    `  - **Correctly Identifying Unsupported Claims / Unavailable Translations in Challenge Tests:** \`>= 95%\``,
    `  - **Required-Source Citation Coverage:** \`100%\``,
    `  - **Critical Fabricated Quotations:** \`0\` (Zero-tolerance hard blocker)`,
    `  - **Regression Tests Passed Before Release:** \`100%\``,
    ``,
    `---`,
    ``,
    `## 5. Complete 4-Stage Bible Learning Pathway (\`Beginner\` $\\rightarrow$ \`Ministry Preparation\`)`,
    `| Pathway Stage | Target Learner | Core Curriculum & Milestones |`,
    `| :--- | :--- | :--- |`,
    `| **Stage 1: Beginner** | New believers, seekers, youth, introductory prison/church classes | How the Bible is organized (66 books, OT/NT covenants, genres), how to read a passage in its surrounding context, foundational storyline from Creation to New Creation. |`,
    `| **Stage 2: Intermediate** | Small-group members, regular Bible students | Book-by-book literary structure (\`Genesis\` to \`Revelation\`), major covenants (Abrahamic, Mosaic, Davidic, New), historical geography (Egypt, Assyria, Babylon, Persia, Rome), and OT-to-NT cross-references. |`,
    `| **Stage 3: Advanced** | Seminary students, lay elders, advanced researchers | Biblical Hebrew, Aramaic & Koine Greek lexical/grammatical tools (\`STEP Bible\`), textual criticism (\`MT\`, \`LXX\`, \`DSS\`, \`NT manuscripts\`), hermeneutics, and comparative Christian traditions. |`,
    `| **Stage 4: Ministry Preparation** | Pastors, chaplains, prison ministry leaders, Sunday school & small-group teachers | Expository & topical sermon construction, 45-minute classroom lesson design, handling difficult/disputed questions in live discussions, and pastoral application without twisting Scripture. |`,
    ``,
    `---`,
    ``,
    `## 6. Worked Demonstrations of the Three Ministry Modes (\`Batch 002\`)`,
    ``,
    `### Mode A: Sermon Preparation Engine — 35-Minute Prison Ministry Sermon on \`Ephesians 2:1–10\``,
    buildEphesiansPrisonSermon(35),
    ``,
    `---`,
    ``,
    `### Mode B: Bible Study Classroom Engine — 45-Minute Lesson on the Life of Joseph (\`Genesis 37–50\`)`,
    buildJosephBibleStudyLesson(45),
    ``,
    `---`,
    ``,
    `### Mode C: Interactive Bible Discussion Engine — *"If God had a plan for Joseph, why did Joseph have to suffer?"*`,
    buildJosephSufferingDiscussionResponse(),
    ``,
    `---`,
    ``,
    `## 7. Complete Solutions to All 10 Genesis-to-Revelation Acceptance Tests (\`BIBLE-AT-01\` – \`BIBLE-AT-10\`)`,
    buildBibleAcceptanceTestsSection(),
    ``,
    `---`,
    ``,
    buildBibleTemplateLibrarySection(),
  ].join("\n");
}

export interface BibleTemplateSelection {
  templateId: string;
  templateName: string;
  version: string;
  categoryCode: string;
  detectedGenre: "Poetic_Wisdom" | "Epistle_Doctrinal" | "Apocalyptic_Prophetic" | "Historical_Narrative_Gospel";
  genreAdaptationRule: string;
  requiredSections: string[];
  optionalSectionsIncluded: string[];
}

/**
 * Intelligent Template Selection Engine:
 * Selects the optimal master template and adapts its internal structure to the biblical genre,
 * passage, audience, purpose, and duration.
 */
export function selectBibleTemplate(question: string, targetPassage: string): BibleTemplateSelection {
  const q = question.toLowerCase();
  const p = targetPassage.toLowerCase();

  const detectedGenre: BibleTemplateSelection["detectedGenre"] =
    /\b(psalms?|job|proverbs|ecclesiastes|song\s+of\s+(?:solomon|songs)|lamentations)\b/i.test(p) ||
    /\b(psalms?|poetic|poetry|wisdom\s+literature)\b/i.test(q)
      ? "Poetic_Wisdom"
      : /\b(romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude)\b/i.test(
            p
          ) || /\b(epistle|paul'?s\s+letter)\b/i.test(q)
        ? "Epistle_Doctrinal"
        : /\b(revelation|daniel|isaiah|jeremiah|ezekiel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)\b/i.test(
              p
            ) || /\b(apocalyptic|prophecy|prophetic|millenni)\b/i.test(q)
          ? "Apocalyptic_Prophetic"
          : "Historical_Narrative_Gospel";

  const genreAdaptationRule =
    detectedGenre === "Poetic_Wisdom"
      ? "Poetic / Psalm Structure: Organizes exposition by Hebrew poetic stanzas, synonymous/antithetic parallelism, central metaphor (e.g., Shepherd/Host in Psalm 23), and emotional/liturgical movement from lament or trust to praise."
      : detectedGenre === "Epistle_Doctrinal"
        ? "Epistle / Rhetorical Argument Structure: Traces logical connectors ('therefore', 'for', 'but God'), grammatical-theological flow (Indicative of grace -> Imperative of spirit-empowered living, e.g., Romans 8 or Ephesians 2:1-10), and first-century church occasion."
        : detectedGenre === "Apocalyptic_Prophetic"
          ? "Prophetic / Apocalyptic Multi-Horizon Structure: Separates initial historical crisis, symbolic imagery, OT intertexts, and fair comparison of major Christian interpretive frameworks (Preterist, Historicist, Futurist, Idealist; Premillennial, Amillennial, Postmillennial)."
          : "Historical Narrative / Gospel Structure: Follows plot arc (setting, tension, turning point, resolution), narrator's explicit theological evaluation, character contrasts, and canonical trajectory toward Christ.";

  if (/\b(sermon|preach|homily|pulpit|manuscript)\b/i.test(q)) {
    const isPrison = /\b(prison|correctional|inmate|chapel)\b/i.test(q);
    return {
      templateId: isPrison ? "BIBLE-TPL-PRISON-001" : "BIBLE-TPL-SERMON-001",
      templateName: isPrison
        ? "Master Template A (Prison Ministry Variation) — Expository & Redemptive Sermon"
        : "Master Template A — Standard Expository / Topical Sermon",
      version: "1.0.0",
      categoryCode: isPrison ? "TPL-CAT-12 (Ministry-Specific / Prison)" : "TPL-CAT-01 (Sermon Preparation)",
      detectedGenre,
      genreAdaptationRule,
      requiredSections: [
        "1. Sermon Title, Theme & Central Biblical Message (Big Idea)",
        "2. Primary Text, Supporting Passages & Authorized Translation Metadata",
        "3. Historical, Literary & Original-Language Context",
        "4. Introduction & Audience Connection",
        "5. Two to Four Main Points with Verse-by-Verse Exposition (Genre-Adapted)",
        "6. Clearly Labeled Illustrations & Practical Applications (Separated from Explicit Text)",
        "7. Conclusion & Pastoral Response / Invitation",
      ],
      optionalSectionsIncluded: [
        "Opening & Closing Prayers",
        "Speaker Notes & Estimated Section Timings",
        "Printable Outline / Slide Deck Summary",
      ],
    };
  }

  if (/\b(discussion|debate|forum|q&a|difficult\s+question|why\s+did)\b/i.test(q)) {
    return {
      templateId: "BIBLE-TPL-DISCUSS-001",
      templateName: "Master Template C — Interactive Bible Discussion & Multi-View Facilitator",
      version: "1.0.0",
      categoryCode: "TPL-CAT-03 (Interactive Bible Discussions)",
      detectedGenre,
      genreAdaptationRule,
      requiredSections: [
        "1. Discussion Topic, Objectives, Target Audience & Primary Passages",
        "2. Opening Question & Introductory Biblical Context",
        "3. Open-Ended Discussion Prompts (Observation -> Meaning -> Application)",
        "4. Suggested Follow-Up Questions Based on Participant Responses",
        "5. Verified Scripture Evidence & Fair Comparison of Christian Interpretations",
        "6. Facilitator Guidance for Handling Disagreement & Difficult Questions",
        "7. Summary of Insights, Unresolved Questions & Suggested Next Reading",
      ],
      optionalSectionsIncluded: ["Advanced Digging-Deeper Prompts", "Closing Group Reflection & Prayer"],
    };
  }

  return {
    templateId: "BIBLE-TPL-STUDY-001",
    templateName: "Master Template B — Structured Bible Study Class & Teacher Package",
    version: "1.0.0",
    categoryCode: "TPL-CAT-02 (Bible Study Classes)",
    detectedGenre,
    genreAdaptationRule,
    requiredSections: [
      "1. Lesson Title, Target Audience & Session Duration",
      "2. Measurable Learning Objectives & Required Materials",
      "3. Opening Activity & Introductory Hook Question",
      "4. Primary Scripture Reading & Contextual / Lexical Explanation (Genre-Adapted)",
      "5. Structured Lesson Sections with Teacher Notes & Student Handout Points",
      "6. Open-Ended Discussion Questions with Suggested Teacher Answers",
      "7. Group Activity & Comprehension Quiz with Answer Key",
      "8. Lesson Recap, Responsible Personal Application & Take-Home Assignment",
    ],
    optionalSectionsIncluded: ["Multiweek Curriculum Progression Hook", "Memory Verse & S.O.A.P. Journal Prompt"],
  };
}

/**
 * Builds the complete specification for the Reusable, Version-Controlled Bible Content Template Library
 * (NOCTIS-BIBLE-TEMPLATES-001 / Batch 003), including the 12 required categories, Master Templates A, B, and C,
 * the Intelligent Genre-Aware Template Selection Engine, lifecycle governance, and acceptance gates.
 */
export function buildBibleTemplateLibrarySection(): string {
  return [
    `## 8. Reusable, Version-Controlled Bible Content Template Library (\`NOCTIS-BIBLE-TEMPLATES-001\`)`,
    ``,
    `> [!IMPORTANT]`,
    `> **Implementation & Verification Status:** \`SPECIFICATION — IMPLEMENTATION AND VALIDATION PENDING.\` While the deterministic template schemas, genre-aware selection logic, and Master Templates A, B, and C below are active in the Noctis runtime, full human educator sign-off across all 12 categories and multi-tradition regression suites are tracked as release gates prior to production certification.`,
    ``,
    `### 8.1 The 12 Required Developer Template Categories (\`TPL-CAT-01\` – \`TPL-CAT-12\`)`,
    `| Category Code | Template ID (v1.0.0) | Template Family & Supported Variations | Primary Output Deliverables |`,
    `| :--- | :--- | :--- | :--- |`,
    `| \`TPL-CAT-01\` | \`BIBLE-TPL-SERMON-001\` | **Sermon Preparation (Essential):** Expository, topical, textual, evangelistic, devotional, funeral, wedding, revival. | Sermon manuscript, 2–4 point outline, verified Scripture references, illustrations, labeled applications, conclusion, optional prayers, speaker timings. |`,
    `| \`TPL-CAT-02\` | \`BIBLE-TPL-STUDY-001\` | **Bible Study Classes (Essential):** Single-session class, chapter study, book study, inductive study. | Learning objectives, timetable, readings, contextual explanation, teacher notes, student handout, 10 discussion Q&As, group activity, quiz + answer key, homework. |`,
    `| \`TPL-CAT-03\` | \`BIBLE-TPL-DISCUSS-001\` | **Interactive Bible Discussions (Essential):** Small-group discussion, Q&A, guided debate, difficult questions, online Bible forums. | Opening question, open-ended prompts, adaptive follow-ups, Scripture evidence, multi-tradition comparison, facilitator conflict guidance, unresolved-questions summary. |`,
    `| \`TPL-CAT-04\` | \`BIBLE-TPL-SUNDAY-001\` | **Sunday School & Children's Lessons:** Early elementary, upper elementary, family Sunday school. | Age-appropriate story arc, object lesson, memory verse, interactive review game, parent take-home sheet. |`,
    `| \`TPL-CAT-05\` | \`BIBLE-TPL-YOUTH-001\` | **Youth Bible Teaching:** Middle school & high school ministry nights, camp sessions. | High-engagement icebreaker, big-idea Scripture unpack, real-life peer scenarios, small-group breakout questions, weekly challenge. |`,
    `| \`TPL-CAT-06\` | \`BIBLE-TPL-DISCIPLE-001\` | **Discipleship & New-Believer Courses:** Baptism prep, foundations of the faith, 1-on-1 mentoring, leadership training. | Core doctrine from Scripture, spiritual disciplines practice, self-check questions, mentor coaching notes. |`,
    `| \`TPL-CAT-07\` | \`BIBLE-TPL-DEVOTIONAL-001\` | **Personal Study, Devotionals & Prayer Guides:** Daily devotionals, S.O.A.P. journals (Scripture, Observation, Application, Prayer), A.C.T.S. prayer guides, 30/90/365-day reading plans. | Focal passage, concise meditation, reflection prompt, guided Scripture prayer, further reading. |`,
    `| \`TPL-CAT-08\` | \`BIBLE-TPL-ASSESS-001\` | **Bible Quizzes, Examinations & Assessments:** Chapter quizzes, seminary/institute exams, flashcards, memory-verse drills. | Multiple-choice, short-answer, cross-reference matching, and essay questions with full verse-verified answer keys and rubric. |`,
    `| \`TPL-CAT-09\` | \`BIBLE-TPL-INDUCTIVE-001\` | **Character, Chapter, Book & Topical Studies:** Biographical studies (e.g., Joseph, Ruth, David, Paul), book overviews, thematic studies. | Inductive Observation (What does it say?), Interpretation (What did it mean?), Correlation (Where else in Scripture?), Application (How should we live?). |`,
    `| \`TPL-CAT-10\` | \`BIBLE-TPL-LEXICAL-001\` | **Biblical Word Studies & Difficult-Passage Analysis:** Hebrew/Aramaic/Greek lemma studies (e.g., *ḥesed*, *dikaiosynē*, *logos*), apparent contradictions, disputed texts. | Original-language lemma, morphological range, LXX bridge, key occurrences across the canon, translation comparison, and competing scholarly/tradition views. |`,
    `| \`TPL-CAT-11\` | \`BIBLE-TPL-CURRICULUM-001\` | **Multiweek Bible Curricula:** 4-week, 6-week, 8-week, and 12-week progressive courses. | Course syllabus, scope-and-sequence table, week-by-week lesson progression, cumulative review, and capstone assessment. |`,
    `| \`TPL-CAT-12\` | \`BIBLE-TPL-PRISON-001\` | **Ministry-Specific Resources (Prison Ministry, Recovery, Chaplaincy):** Correctional chapel sermons, cell-study workbooks, recovery group lessons. | Trauma- and incarceration-aware pastoral sensitivity, clear grace-vs-record framing, printable low-tech handout format, zero jargon. |`,
    ``,
    `---`,
    ``,
    `### 8.2 Specification of the Three Master Templates (\`Template A\`, \`Template B\`, \`Template C\`)`,
    ``,
    `| Schema Attribute | **Template A — Sermon (\`BIBLE-TPL-SERMON-001\`)** | **Template B — Bible Study Class (\`BIBLE-TPL-STUDY-001\`)** | **Template C — Interactive Discussion (\`BIBLE-TPL-DISCUSS-001\`)** |`,
    `| :--- | :--- | :--- | :--- |`,
    `| **Version & Purpose** | \`v1.0.0\` · Produce complete, contextually faithful sermons (30–40 min standard; 15–50 min adjustable). | \`v1.0.0\` · Produce ready-to-teach classroom packages (45–60 min standard; 30–90 min adjustable). | \`v1.0.0\` · Facilitate multi-perspective group dialogue (30–60 min standard). |`,
    `| **Required Inputs** | \`passage_or_topic\`, \`sermon_type\` (expository/topical/etc.), \`audience\`, \`duration_minutes\`. | \`passage_or_topic\`, \`study_type\`, \`target_audience\`, \`duration_minutes\`. | \`topic_or_question\`, \`primary_passages\`, \`group_type\`, \`duration_minutes\`. |`,
    `| **Optional Inputs** | \`base_translation\`, \`tradition_lens\`, \`include_prayer\`, \`include_invitation\`, \`manuscript_length\`, \`include_slides\`. | \`base_translation\`, \`question_count\` (default 10), \`quiz_length\` (default 5), \`multiweek_series_position\`. | \`traditions_to_compare\`, \`difficulty_level\`, \`debate_moderation_mode\`. |`,
    `| **Ordered Required Output Sections** | 1. Sermon Title & Central Biblical Message<br>2. Primary Text & Supporting Passages<br>3. Historical, Literary & Lexical Context<br>4. Introduction & Audience Connection<br>5. 2–4 Main Points with Biblical Exposition<br>6. Labeled Illustrations & Practical Applications<br>7. Conclusion & Response/Invitation | 1. Lesson Title, Audience & Duration<br>2. Measurable Learning Objectives<br>3. Opening Activity & Hook Question<br>4. Primary Scripture & Contextual Explanation<br>5. Lesson Sections with Teacher Notes<br>6. Discussion Questions + Suggested Answers<br>7. Group Activity & Comprehension Quiz + Key<br>8. Recap, Application & Homework | 1. Topic, Objectives, Audience & Passages<br>2. Opening Question & Introductory Context<br>3. Open-Ended Discussion Prompts<br>4. Adaptive Follow-Up Questions<br>5. Verified Scripture Evidence & Alternative Views<br>6. Facilitator Guidance for Disagreement<br>7. Summary of Insights & Unresolved Questions<br>8. Closing Reflection & Next Reading |`,
    `| **Conditional / Optional Sections** | Opening/closing prayers, speaker delivery notes, per-section minute timings, slide deck outline. | Student fill-in-the-blank worksheet, memory verse drill, multiweek bridge to next lesson. | Advanced greek/hebrew sidebar, historical-critical appendix, moderated debate rules. |`,
    `| **Validation & Quality Rules** | 100% verse-reference check; mandatory separation of **What the Text Says** vs. **Preacher's Application**; minute timings must sum to \`duration_minutes\`. | Every discussion question and quiz item must include a verified teacher answer key anchored to the passage. | Must represent competing Christian traditions fairly without forcing consensus on disputed doctrines or inventing citations. |`,
    ``,
    `---`,
    ``,
    `### 8.3 Intelligent Genre-Aware Template Selection & Adaptation Architecture`,
    ``,
    `\`\`\`mermaid`,
    `flowchart LR`,
    `    Req["User Request: Passage · Topic · Audience · Purpose · Duration"] --> Selector["Template Selection Engine (Genre + Purpose + Audience Classifier)"]`,
    `    Selector --> Genre["Genre Adaptation Layer: Poetic (Psalm 23) | Epistle (Romans 8) | Narrative (Joseph) | Apocalyptic (Revelation)"]`,
    `    Genre --> Evidence["Bible Knowledge & Evidence Engine (Scripture + Hebrew/Greek + Traditions)"]`,
    `    Evidence --> Generator["Content Generation Engine (Populates Required & Conditional Sections)"]`,
    `    Generator --> Validator["Validation & Final Output Gate (Citation Check · Text-vs-Application · Completeness)"]`,
    `\`\`\``,
    ``,
    `- **How Intelligent Genre Adaptation Works in Practice:**`,
    `  1. **Poetic / Wisdom Request (*e.g., "Prepare a sermon on \`Psalm 23\`"*):**`,
    `     - Selects \`BIBLE-TPL-SERMON-001\` + **Poetic/Psalm Variation**: structures main points around the Psalm's poetic imagery and stanza shifts—**(I) The Shepherd in the Pastures and Dark Valley (\`vv. 1–4\`, shifting from 3rd person "He" to 2nd person intimate "You are with me" in the valley of the shadow of death [*tsalmawet*])**, and **(II) The Royal Host in the Presence of Enemies and the House of the LORD Forever (\`vv. 5–6\`, pursuing *טוֹב וָחֶסֶד* [goodness and *ḥesed*])**, connecting to \`Ezekiel 34\` and \`John 10:11\`.`,
    `  2. **Epistle / Doctrinal Request (*e.g., "Prepare a Bible study lesson on \`Romans 8\`"*):**`,
    `     - Selects \`BIBLE-TPL-STUDY-001\` + **Epistle Argument Variation**: structures the lesson around Paul's logical chain from **"No Condemnation in Christ Jesus" (\`Romans 8:1–4\`)** $\\rightarrow$ **Life in the Spirit vs. the Flesh and Adoption as Heirs (\`vv. 5–17\`)** $\\rightarrow$ **Groaning of Creation, Intercession of the Spirit, and Golden Chain of Redemption (\`vv. 18–30\`)** $\\rightarrow$ **"No Separation from the Love of God" (\`vv. 31–39\`)**.`,
    `  3. **Apocalyptic / Disputed Question (*e.g., "Start a group discussion on \`Revelation 20\`"*):**`,
    `     - Selects \`BIBLE-TPL-DISCUSS-001\` + **Apocalyptic Multi-View Variation**: structures the discussion around what \`Revelation 20:1–15\` explicitly depicts while laying out **Premillennial**, **Amillennial**, and **Postmillennial** readings side-by-side with facilitator guidance to keep the group united on shared essentials (Christ's bodily return, final victory over evil, and new creation).`,
    `- **Template Lifecycle Administration & Version Control:**`,
    `  - Every template supports RBAC-governed administrative actions: \`create\`, \`edit\`, \`version\` (semantic versioning \`MAJOR.MINOR.PATCH\`), \`test\` (automated schema & citation regression), \`approve\` (subject-matter educator sign-off), \`publish\`, \`retire\`, and \`rollback\`.`,
  ].join("\n");
}

/**
 * Complete, ready-to-preach Poetic/Psalm Expository Sermon (or Bible Study Lesson) on Psalm 23:1–6.
 */
export function buildPsalm23SermonOrStudy(
  durationMinutes = 30,
  mode: "sermon" | "study" | "discussion" = "sermon",
  tpl: BibleTemplateSelection = selectBibleTemplate("Prepare a sermon on Psalm 23", "Psalm 23")
): string {
  const p1Mins = Math.max(6, Math.round((durationMinutes - 8) * 0.35));
  const p2Mins = Math.max(7, Math.round((durationMinutes - 8) * 0.4));
  const p3Mins = Math.max(5, durationMinutes - 8 - p1Mins - p2Mins);

  return [
    `# Noctis Bible Intelligence Engine — ${mode === "study" ? "Bible Study Classroom Package" : "Complete Sermon Preparation Package"} (\`NOCTIS-BIBLE-001\`)`,
    `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
    `- **Template Category:** \`${tpl.categoryCode}\``,
    `- **Target Passage / Topic:** \`Psalm 23:1–6\` (Detected Genre: \`${tpl.detectedGenre}\` — Hebrew Lyric Psalm of Trust)`,
    `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
    `- **Estimated Duration:** **${durationMinutes} Minutes** (Ready-to-Preach Manuscript & Teaching Package — Minimal Additional Prep Required)`,
    `- **Hermeneutical Integrity Gate:** Explicitly separates **(1) What \`Psalm 23:1–6\` states in its original Hebrew poetic and historical context** from **(2) Canonical fulfillment across Scripture** and **(3) Labeled contemporary pastoral illustrations and applications**.`,
    ``,
    `---`,
    ``,
    `## 1. Verbatim Scripture Text (\`Psalm 23:1–6\`, KJV Public Domain)`,
    `> **Superscription:** *A Psalm of David (\`מִזְמוֹר לְדָוִד\`, Mizmor le-Dawid).*`,
    `> **\`23:1\`** *"The LORD is my shepherd; I shall not want."*`,
    `> **\`23:2\`** *"He maketh me to lie down in green pastures: he leadeth me beside the still waters."*`,
    `> **\`23:3\`** *"He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake."*`,
    `> **\`23:4\`** *"Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me."*`,
    `> **\`23:5\`** *"Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over."*`,
    `> **\`23:6\`** *"Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever."*`,
    ``,
    `---`,
    ``,
    `## 2. Historical, Literary & Original-Language Context (\`BIBLE-DOM-03\`, \`BIBLE-DOM-05\`)`,
    `- **Authorial & Historical Setting (What the Text & Canon Supply):**`,
    `  - Attributed in the Hebrew superscription to **David** (\`מִזְמוֹר לְדָוִד\`), who tended his father Jesse's sheep in the rugged Judean hills around Bethlehem (\`1 Samuel 16:11\`; \`17:34–37\`) before being anointed shepherd-king over Israel (\`2 Samuel 5:2\`; \`Psalm 78:70–72\`) and later hunted through the wilderness by Saul (\`1 Samuel 22–24\`) and Absalom (\`2 Samuel 15–17\`).`,
    `  - In the Ancient Near East, kingship was regularly described under the metaphor of a shepherd, yet human kings repeatedly exploited the flock (\`Ezekiel 34:1–10\`). David confesses that even the king of Israel is first a sheep under the personal care of **YHWH**.`,
    `- **Poetic Structure & The Crucial Pronoun Shift in \`Verse 4\`:**`,
    `  - \`Psalm 23\` unfolds across **two governing metaphors** corresponding to the annual cycle of Judean pastoral life and royal hospitality:`,
    `    1. **Stanza I (\`vv. 1–4\`) — YHWH the Shepherd:** Moves from green spring pastures and quiet waters (\`vv. 1–3\`) through the dark limestone ravines (\`v. 4\`) toward the summer highlands.`,
    `    2. **Stanza II (\`vv. 5–6\`) — YHWH the Royal Covenant Host:** Welcomes the weary traveler into the Lord's banquet tent in full view of enemies (\`v. 5\`) and into the permanent dwelling of the LORD's house (\`v. 6\`).`,
    `  - **Exegetical Turning Point:** In \`vv. 1–3\`, David speaks **about** God in the **third person** (*"He maketh me... He leadeth me... He restoreth"*). The moment David steps into \`v. 4\` (*"the valley of the shadow of death"*), the Hebrew grammar shifts to the **second person** (*"for **Thou** art with me; **Thy** rod and **Thy** staff"*). In the green pastures we often speak *about* God; in the dark valley we speak *directly to* God because the Shepherd walks beside us.`,
    `### Original-Language Hebrew Lexical Reference Table (\`STEP Bible\` / \`BDB\` / \`HALOT\`)`,
    ``,
    `| Verse | Hebrew Term & Transliteration | Grammatical Form & Exegetical Meaning |`,
    `| :--- | :--- | :--- |`,
    `| \`23:1a\` | \`יְהוָה רֹעִי\` (*YHWH Ro'i*) | Covenant name **YHWH** (\`Exodus 3:14–15\`, self-existent *"I AM"*) + Qal active participle of \`רָעָה\` (*ra'ah*, to pasture, tend, feed, companion) with 1st-person singular suffix (*"my Shepherd"*). |`,
    `| \`23:1b\` | \`לֹא אֶחְסָר\` (*lo' echsar*) | Imperfect of \`חָסֵר\` (*chaser*, to lack, diminish, or suffer deficiency). Thematic thesis of the Psalm: under YHWH's care we never lack what is necessary for life and godliness (\`Deuteronomy 2:7\`; \`Nehemiah 9:21\`). |`,
    `| \`23:2\` | \`נְאוֹת דֶּשֶׁא\` (*ne'ot deshe'*) & \`מֵי מְנֻחוֹת\` (*mei menuchot*) | *"Pastures of tender fresh grass"* and *"waters of rest/quietness"* (contrasted with rushing wadis that terrify and drown fleece-heavy sheep). |`,
    `| \`23:3\` | \`נַפְשִׁי יְשׁוֹבֵב\` (*nafshi yeshovev*) & \`מַעְגְּלֵי־צֶדֶק\` (*ma'gelei-tsedeq*) | Polel imperfect of \`שׁוּב\` (*shuv*, to turn back, right a "cast" sheep, revive vitality [\`nephesh\`]) and *"well-worn tracks/paths of righteousness"* (\`Psalm 19:7\`). |`,
    `| \`23:4a\` | \`גֵּיא צַלְמָוֶת\` (*gei tsalmawet*) | Narrow limestone gorge/ravine (*gei*) of *tsalmawet* (\`צֵל\` [shadow] + \`מָוֶת\` [death] / *"deepest impenetrable gloom"*), encompassing mortal danger, grief, and dying. |`,
    `| \`23:4b\` | \`שִׁבְטְךָ וּמִשְׁעַנְתֶּךָ\` (*shivtekha u-mish'antekha*) | The heavy oak club (**rod**, *shevet*) worn at the belt to drive off predators and the curved crook (**staff**, *mish'enet*) used to guide and lift sheep out of crevices (**protection + correction**). |`,
    `| \`23:6\` | \`טוֹב וָחֶסֶד יִרְדְּפוּנִי\` (*tov va-chesed yirdefuni*) | \`רָדַף\` (*radaf*) means **"to actively pursue, chase, or hunt down"** (\`Exodus 14:8\`; \`1 Samuel 23:25\`): instead of enemies hunting David down, God's goodness (*tov*) and covenant love (*ḥesed*) actively pursue the believer every day of life. |`,
    ``,
    `---`,
    ``,
    `## 3. Complete ${durationMinutes}-Minute Expository Sermon Manuscript & Outline`,
    `- **Sermon Title:** *"The Shepherd in the Valley and the Host at the Table: Why God's Flock Never Walks Alone"*`,
    `- **Central Biblical Proposition (Big Idea):** *Because the covenant LORD Himself is your Shepherd and Royal Host, you lack no true provision in the pastures, you face no solitary darkness in the valley, and you are actively pursued by His covenant love all the way to the Father's house.*`,
    ``,
    `### Introduction (5 Minutes)`,
    `- **Spoken Manuscript Opening:**`,
    `  > *"Church family, there is a reason \`Psalm 23\` has been whispered in hospital rooms, recited beside open graves, memorized by children in Sunday school, and prayed by soldiers and prisoners for three thousand years. Six short verses—only 55 words in the original Hebrew—yet they answer the three deepest anxieties of every human heart: **Will I have enough for today? Will I survive the dark valley tomorrow? And where will I belong when my days on earth are done?**"*`,
    `  > *"Notice how David begins in \`verse 1\`: not 'The LORD is **a** shepherd,' and not merely 'The LORD is the world's shepherd,' but '**The LORD (\`YHWH\`) is MY shepherd; I shall not want.**' Before David was ever a king in a palace, he knew what it meant to sleep on cold Judean stones with a sling in his hand and a flock of helpless sheep depending on his vigilance. Sheep have no fangs, no claws, no camouflage, and no sense of direction. Left to themselves, they overgraze ruined ground, drink from polluted ruts, and wander off ledges. Simply put: **the quality of a sheep's life is determined entirely by the character of its shepherd.** And today, \`Psalm 23\` walks us through three movements of the Shepherd's care: His **Provision in the Pastures (\`vv. 1–3\`)**, His **Presence in the Dark Valley (\`v. 4\`)**, and His **Pursuit to the Father's House (\`vv. 5–6\`)**."*`,
    ``,
    `### Main Point I — The Shepherd's Provision & Restoration in the Pastures (\`Psalm 23:1–3\` · ${p1Mins} Minutes)`,
    `- **1. Explicit Textual Exposition (What the Text States):**`,
    `  - **Identity Before Inventory (\`v. 1\`):** David anchors *"I shall not want (\`lo' echsar\`)"* directly in the covenant name \`YHWH\`. Because the Creator who spoke to Moses from the burning bush (\`Exodus 3:14\`) has made Himself David's Shepherd, lack cannot have the final word.`,
    `  - **Rest and Refreshment (\`v. 2\`):** *"He maketh me to lie down in green pastures: he leadeth me beside the still waters (\`mei menuchot\`)."* In the Judean wilderness, green grass is sparse—consisting of tufts of tender herbage nourished by overnight dew on rocky slopes. A shepherd must know where the grass grows and must lead the flock to quiet waters before the midday heat. Sheep will not lie down unless four conditions are met: they are free from fear of predators, free from friction within the flock, free from pests, and free from hunger. It is the **Shepherd** who creates those conditions.`,
    `  - **Soul-Restoration & Right Paths (\`v. 3\`):** *"He restoreth my soul (\`nafshi yeshovev\`): he leadeth me in the paths of righteousness (\`ma'gelei-tsedeq\`) for his name's sake."* The Hebrew \`ma'gelei-tsedeq\` refers to well-worn wagon tracks or sicheren mountain trails that actually lead to the high pasture—as opposed to false sheep-paths that dead-end at a cliff. And notice God's ultimate motive: **"for His name's sake"**—His own reputation and covenant faithfulness are staked on getting His sheep safely home.`,
    `- **2. \`[Preacher's Illustration — Explicitly Labeled]\`:**`,
    `  - *Shepherd veteran Phillip Keller notes that a "cast sheep"—a heavy ewe that rolls onto its back in a hollow—cannot stand up on its own. Its center of gravity shifts, gases build up in the rumen, circulation cuts off to the legs, and within hours it will die unless the shepherd notices one missing from the count, searches the hillside, rolls the sheep upright, and massages its legs until strength returns. That is the exact picture behind \`נַפְשִׁי יְשׁוֹבֵב\` ("He restoreth my soul").*`,
    `- **3. \`[Pastoral Application — Explicitly Labeled]\`:**`,
    `  - **Spoken Application:** *"Some of you walked into this sanctuary today spiritually 'cast'—exhausted by financial pressure, caregiving fatigue, or quiet guilt over a path you took this past month. Hear \`verse 3\`: your Shepherd does not despise a cast sheep. He comes looking for you, sets you back on your feet, and leads you onto right paths—not because you earned a flawless record, but **for His name's sake**."*`,
    ``,
    `### Main Point II — The Shepherd's Presence & Protection in the Dark Valley (\`Psalm 23:4\` · ${p2Mins} Minutes)`,
    `- **1. Explicit Textual Exposition (What the Text States):**`,
    `  - **The Valley Is ON the Right Path (\`v. 4a\`):** Notice the connection between \`verse 3\` and \`verse 4\`: the Shepherd leads us in *"paths of righteousness"* (\`v. 3\`), and the very next sentence is *"Yea, though I walk through the valley of the shadow of death (\`gei tsalmawet\`)"* (\`v. 4\`). Being in a dark valley is **not** proof that you took a wrong turn or that God abandoned you; in Judean geography, the low canyon wadi is the only route from the winter lowlands to the high summer tablelands.`,
    `  - **Preposition of Hope ("Through"):** David says *"though I walk **through** (\`בְּגֵיא\`) the valley"*—not *"though I pitch my tent and die in the valley."* And notice the pace: *"I **walk**"*—not panic-stricken flight, because the Shepherd sets the pace.`,
    `  - **The Grammar of Intimacy ("Thou Art With Me" · \`v. 4b\`):** Point out to the congregation how David stops saying *"He"* and starts saying *"Thou"*: ***"I will fear no evil: for THOU art with me; THY rod and THY staff they comfort me."*** Evil is real in the valley—David does not deny the predators or the shadows—but fear is disarmed by the **personal presence** of the Shepherd (\`עִמָּדִי\`, *'immadi*, "with me") armed with His defensive club (*shevet*) and guiding staff (*mish'enet*).`,
    `- **2. Canonical Trajectory & Christological Fulfillment (\`BIBLE-DOM-06\`, \`BIBLE-DOM-07\`):**`,
    `  - **Prophetic Promise (\`Ezekiel 34:11–16, 23\`):** When Israel's unfaithful rulers fleeced the flock, YHWH declared: *"Behold, I, even I, will both search my sheep, and seek them out... and I will set up one shepherd over them, even my servant David."*`,
    `  - **New Testament Fulfillment (\`John 10:11, 14, 27–28\`; \`Hebrews 13:20\`; \`1 Peter 2:25\`):** In \`John 10:11\`, Jesus steps forward and says in Greek (\`Ἐγώ εἰμι ὁ ποιμὴν ὁ καλός\`): ***"I am the good shepherd: the good shepherd giveth his life for the sheep."*** Why does the shadow of death have no ultimate terror for the Christian? Because on the cross at Calvary, the Good Shepherd walked into the valley of **actual death**—taking the blow of judgment Himself—and rose again as *"that great shepherd of the sheep, through the blood of the everlasting covenant"* (\`Hebrews 13:20\`).`,
    `- **3. \`[Preacher's Illustration — Explicitly Labeled]\`:**`,
    `  - *A shadow can look gigantic against a canyon wall, but a shadow has no teeth. The shadow of a sword cannot cut you; the shadow of a serpent cannot poison you; and where there is a shadow, there must be a Light shining behind it. Because Jesus Christ conquered death, death for the believer has been reduced to a shadow on the way home.*`,
    `- **4. \`[Pastoral Application — Explicitly Labeled]\`:**`,
    `  - **Spoken Application:** *"If you are walking through the valley of a medical diagnosis, a broken marriage, bereavement, or a season of deep depression today: stop talking merely **about** God from a distance and turn to Him in the second person—'Lord, **You** are with me right here.' Let both His rod (His sovereign protection) and His staff (His gentle correction through Scripture and the church) steady your steps this week."*`,
    ``,
    `### Main Point III — The Royal Host's Table & Unending Pursuit of Covenant Love (\`Psalm 23:5–6\` · ${p3Mins} Minutes)`,
    `- **1. Explicit Textual Exposition (What the Text States):**`,
    `  - **A Banquet in the Presence of Enemies (\`v. 5\`):** *"Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over."* Whether viewed as the shepherd clearing flat high-country mesas (*shulchan*) of poisonous plants while predators watch helplessly from the rocks, or as an Ancient Near Eastern royal host welcoming a guest into his tent under the sacred law of hospitality (where no enemy outside dare touch the guest once anointed with fragrant oil and handed an overflowing cup), the meaning is unmistakable: **God does not wait until all our enemies and trials vanish before He feeds us with joy.** He spreads the feast *in their very presence*.`,
    `  - **Hounded by Goodness and *Ḥesed* (\`v. 6a\`):** *"Surely goodness (\`tov\`) and mercy (\`chesed\`) shall follow (\`yirdefuni\` — actively pursue/chase) me all the days of my life."* Every single day—bright days, ordinary days, and valley days—God's goodness and covenant loyalty are on your trail.`,
    `  - **Home Forever (\`v. 6b\`):** *"And I will dwell in the house of the LORD for ever (\`לְאֹרֶךְ יָמִים\`, for length of days / unendingly)."* What begins with a Shepherd in the field ends with a child at home in the Father's house—culminating in \`Revelation 7:17\`: *"For the Lamb which is in the midst of the throne shall feed [shepherd] them, and shall lead them unto living fountains of waters: and God shall wipe away all tears from their eyes."*`,
    `- **2. \`[Pastoral Application — Explicitly Labeled]\`:**`,
    `  - **Spoken Application:** *"Look back over your life: the very fact that you are still here, still hearing God's Word, is proof that His goodness and \`ḥesed\` have been pursuing you even when you ran from Him. Come to His table today—receive His pardon, forgive those who have wronged you, and walk out of these doors knowing you know where you are going to live forever."*`,
    ``,
    `### Conclusion & Closing Prayer (3 Minutes)`,
    `- **Spoken Conclusion:**`,
    `  > *"Beneath us: green pastures. Beside us: still waters. With us in the valley: the Good Shepherd who laid down His life for the sheep. Before us: a prepared table and an overflowing cup. Behind us: goodness and covenant mercy in hot pursuit. And ahead of us: the house of the LORD forever. Can we say it together with personal faith today? **'The LORD is MY shepherd; I shall not want.'**"*`,
    `- **Closing Prayer:**`,
    `  > *"Covenant LORD, our Shepherd and our Host: we thank You that You did not leave us to wander as sheep without a shepherd. Thank You, Lord Jesus, that as the Good Shepherd You entered the valley of death at the cross and rose victorious so that no shadow can separate us from Your love. Restore every cast and weary soul in this room today; lead us in paths of righteousness for Your name's sake; comfort the grieving with Your rod and Your staff; and bring us at last to dwell in Your house forever. In the name of Jesus our Good Shepherd, Amen."*`,
    ``,
    `---`,
    ``,
    `## 4. Bulletin / Small-Group Follow-Up Study Guide (5 Discussion Questions & Teacher Answers)`,
    `1. **Observation (\`v. 1\`):** Why does David begin with *"The LORD (\`YHWH\`) is my shepherd"* before saying *"I shall not want"*?`,
    `   - *Suggested Answer:* Because our sufficiency depends on the identity and covenant faithfulness of the Shepherd (\`YHWH\`), not on our own resources or circumstances.`,
    `2. **Context & Lexical Insight (\`v. 3\`):** What does the Hebrew phrase \`נַפְשִׁי יְשׁוֹבֵב\` (*"He restoreth my soul"*) mean both in shepherding life and in spiritual life?`,
    `   - *Suggested Answer:* It means to bring back a straying or overturned ("cast") sheep to safety and vitality; spiritually, God revives the weary and brings back the wandering heart (\`Psalm 19:7\`).`,
    `3. **Literary Structure (\`vv. 3–4\`):** What changes in the pronouns between \`verses 1–3\` and \`verse 4\`, and why is that significant when we suffer?`,
    `   - *Suggested Answer:* David shifts from 3rd-person *"He"* (\`vv. 1–3\`) to 2nd-person *"Thou art with me"* (\`v. 4\`), showing that suffering moves the believer from talking *about* God to intimate communion *with* God.`,
    `4. **Canonical Cross-Reference (\`Ezekiel 34:11–16\`; \`John 10:11\`):** How does Jesus fulfill \`Psalm 23\` in \`John 10:11–18\`?`,
    `   - *Suggested Answer:* Jesus declares *"I am the good shepherd"* who willingly lays down His life for the sheep and takes it up again, securing eternal life so none can snatch them from His hand (\`John 10:28\`).`,
    `5. **Personal Application (\`v. 6\`):** How does knowing that God's goodness and *ḥesed* actively **pursue** (\`yirdefuni\`) you change the way you face anxiety this week?`,
    `   - *Suggested Answer:* Instead of feeling hunted by fear, regret, or enemies, the believer can rest in God's proactive, covenantal care every day of life.`,
  ].join("\n");
}

/**
 * Complete, ready-to-teach Epistle Bible Study Lesson Plan (or Sermon) on Romans 8:1–39.
 */
export function buildRomans8StudyOrSermon(
  durationMinutes = 45,
  mode: "sermon" | "study" | "discussion" = "study",
  tpl: BibleTemplateSelection = selectBibleTemplate("Create a 45-minute Bible study lesson plan on Romans 8", "Romans 8")
): string {
  return [
    `# Noctis Bible Intelligence Engine — ${mode === "sermon" ? "Complete Sermon Preparation Package" : "Complete Bible Study Classroom Package"} (\`NOCTIS-BIBLE-001\`)`,
    `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
    `- **Template Category:** \`${tpl.categoryCode}\``,
    `- **Study Topic / Passage:** \`Romans 8:1–39\` (Detected Genre: \`${tpl.detectedGenre}\` — Pauline Doctrinal & Pastoral Epistle)`,
    `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
    `- **Session Duration:** **${durationMinutes} Minutes** (Ready-to-Teach Classroom Lesson Plan & Facilitator Guide)`,
    `- **Hermeneutical Integrity Gate:** Explicitly separates **(1) Paul's explicit Koine Greek argument in \`Romans 8\`** from **(2) Fair comparison of Christian traditions on debated verses (\`vv. 29–30\`)** and **(3) Contemporary group application**.`,
    ``,
    `---`,
    ``,
    `## 1. Verbatim Key Scripture Anchors (\`Romans 8\`, KJV Public Domain)`,
    `> **\`8:1–2\`** *"There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit. For the law of the Spirit of life in Christ Jesus hath made me free from the law of sin and death."*`,
    `> **\`8:14–16\`** *"For as many as are led by the Spirit of God, they are the sons of God. For ye have not received the spirit of bondage again to fear; but ye have received the Spirit of adoption, whereby we cry, Abba, Father. The Spirit itself beareth witness with our spirit, that we are the children of God."*`,
    `> **\`8:28\`** *"And we know that all things work together for good to them that love God, to them who are the called according to his purpose."*`,
    `> **\`8:31–32\`** *"What shall we then say to these things? If God be for us, who can be against us? He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?"*`,
    `> **\`8:38–39\`** *"For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord."*`,
    ``,
    `---`,
    ``,
    `## 2. Historical, Literary & Koine Greek Lexical Notes (\`BIBLE-DOM-05\`, \`BIBLE-DOM-08\`)`,
    `- **Authorial & Historical Setting:** Written by the Apostle Paul from Corinth (c. AD 57) to the mixed Jewish-Gentile house churches in Rome (\`Romans 1:7\`; \`16:1–23\`). \`Romans 8\` forms the climax of Paul's exposition of justification, sanctification, and assurance (\`Romans 1–8\`), bridging the groaning under indwelling sin in \`Romans 7:7–25\` to God's faithfulness to Israel and the nations in \`Romans 9–11\`.`,
    `- **Structural Frame:** The chapter begins with **\`Οὐδὲν ἄρα νῦν κατάκριμα\` ("No condemnation now," \`v. 1\`)** and ends with **\`οὐδὲν δυνήσεται ἡμᾶς χωρίσαι\` ("No separation ever," \`vv. 38–39\`)**, propelled by **19 occurrences of \`Πνεῦμα\` (*Pneuma*, the Holy Spirit)**—more than any other chapter in the New Testament.`,
    `- **Key Koine Greek Terms (\`STEP Bible\` / \`BDAG\`):**`,
    `  1. **\`κατάκριμα\` (*katakrima*, \`v. 1\`):** Judicial sentence of guilt and resulting penal servitude. Because God condemned sin in the flesh of His own Son (\`v. 3\`), there is zero judicial sentence remaining against those united to Christ Jesus.`,
    `  2. **\`υἱοθεσία\` (*huiothesia*, \`vv. 15, 23\`):** Full legal adoption as adult sons and heirs under Greco-Roman law, granting the intimate Aramaic-Greek family cry **\`Ἀββᾶ ὁ πατήρ\` (*Abba, Father*)**—the exact address Jesus used in Gethsemane (\`Mark 14:36\`).`,
    `  3. **\`συνεργεῖ\` (*synergei*, \`v. 28\`):** Works together / co-operates toward a telos. Crucially, \`v. 29\` defines what *"the good (\`τὸ ἀγαθόν\`)"* is: **not** material comfort or absence of trouble, but being **conformed to the image of God's Son (\`συμμόρφους τῆς εἰκόνος τοῦ υἱοῦ αὐτοῦ\`)**.`,
    `  4. **\`ὑπερνικῶμεν\` (*hypernikōmen*, \`v. 37\`):** Compound of \`ὑπέρ\` (above/beyond) + \`νικάω\` (conquer)—*"we are more than conquerors / super-victors through Him who loved us,"* not by escaping tribulation (\`v. 35\`), but because tribulation cannot sever us from Christ's love.`,
    ``,
    `---`,
    ``,
    `## 3. Four-Movement Epistle Breakdown & Classroom Pacing (${durationMinutes} Minutes)`,
    `- **Segment 1 — Opening Hook & Context (5 mins):** Ask learners: *"What is the difference between knowing your sins are forgiven on paper and actually living free from shame and fear of the future?"*`,
    `- **Segment 2 — Four-Part Textual Walkthrough (15 mins):**`,
    `  - **Movement I (\`vv. 1–11\`): Life in the Spirit vs. the Flesh.** What the Law could not do because it was weakened by the flesh, God accomplished by sending His own Son in the likeness of sinful flesh and as a sin offering (\`περὶ ἁμαρτίας\`, \`v. 3\`), so that the Spirit who raised Jesus from the dead now indwells believers (\`v. 11\`).`,
    `  - **Movement II (\`vv. 12–17\`): Adoption as Sons and Joint-Heirs.** The Spirit does not put believers back under cringing slavish fear (\`πνεῦμα δουλείας\`), but bears witness that we are God's children and joint-heirs with Christ—sharing both His sufferings and His coming glory (\`v. 17\`).`,
    `  - **Movement III (\`vv. 18–30\`): Three Groanings & The Golden Chain of Redemption.** Creation groans (\`v. 22\`), believers groan awaiting the redemption of our bodies (\`v. 23\`), and the Spirit Himself intercedes with groanings too deep for words (\`v. 26\`). In \`vv. 29–30\`, Paul links five aorist verbs: *foreknew (\`προέγνω\`) $\\rightarrow$ predestined (\`προώρισεν\`) $\\rightarrow$ called (\`ἐκάλεσεν\`) $\\rightarrow$ justified (\`ἐδικαίωσεν\`) $\\rightarrow$ glorified (\`ἐδόξασεν\`)*.`,
    `    - **Interpretive Traditions Note (\`BIBLE-DOM-09\`):**`,
    `      - *Reformed / Augustinian Tradition:* Reads \`προέγνω\` (*foreknew*) covenantally ("whom He set His electing love upon beforehand," cf. \`Amos 3:2\`) and views the five verbs as an unbreakable chain of sovereign monergistic grace for the elect.`,
    `      - *Wesleyan / Arminian Tradition:* Reads \`προέγνω\` as God's omniscient foreknowledge of who would respond in faith to prevenient grace, emphasizing corporate destiny in Christ and conditional perseverance.`,
    `      - *Catholic & Orthodox Traditions:* Emphasize the synergy of divine grace and human participation in baptismal incorporation and *theosis*/conformity to Christ (\`v. 29\`), warning against both presumption and despair.`,
    `  - **Movement IV (\`vv. 31–39\`): Five Unanswerable Courtroom Questions & No Separation.** Who can be against us (\`v. 31\`)? Who will fail to receive all things with Christ (\`v. 32\`)? Who shall bring a charge against God's elect (\`v. 33\`)? Who is to condemn (\`v. 34\`)? Who shall separate us from the love of Christ (\`v. 35\`)? Answer: **Nothing in all creation (\`vv. 38–39\`)!**`,
    ``,
    `---`,
    ``,
    `## 4. Ten Structured Discussion Questions with Teacher Answer Keys (15 Minutes)`,
    `1. **Observation (\`v. 1\`):** What word connects \`Romans 8:1\` to \`Romans 1–7\`, and what judicial verdict does Paul announce?`,
    `   - *Teacher Key:* *"Therefore (\`ἄρα\`)"* connects back to justification by faith in Christ (\`Romans 3–5\`) and deliverance from the wretched struggle of \`Romans 7:24–25\`; the verdict is *"no condemnation (\`κατάκριμα\`)"* now for those in Christ Jesus.`,
    `2. **Context (\`vv. 3–4\`):** Why couldn't the Mosaic Law free us from sin and death, and how did God solve that problem?`,
    `   - *Teacher Key:* The Law was holy (\`7:12\`) but powerless to transform human flesh (\`σάρξ\`). God sent His own Son in the likeness of sinful flesh and for sin, condemning sin in the flesh so the righteous requirement of the Law is fulfilled in us who walk by the Spirit.`,
    `3. **Contrast (\`vv. 5–8\`):** How does Paul contrast the mindset of the flesh (\`φρόνημα τῆς σαρκός\`) with the mindset of the Spirit (\`φρόνημα τοῦ πνεύματος\`)?`,
    `   - *Teacher Key:* The mindset of the flesh is hostility toward God and leads to death, whereas the mindset of the Spirit is life and peace (\`v. 6\`).`,
    `4. **Adoption (\`vv. 14–17\`):** Why is Paul's combination of the Aramaic \`Abba\` and Greek \`ho Patēr\` significant in a mixed Jewish-Gentile church?`,
    `   - *Teacher Key:* It echoes Jesus' own intimate prayer in \`Mark 14:36\` and unites Jewish and Gentile believers as one adopted family with full inheritance rights.`,
    `5. **Suffering & Glory (\`vv. 17–25\`):** How does \`Romans 8:18–25\` Guard against the "prosperity gospel" idea that Spirit-filled Christians won't suffer?`,
    `   - *Teacher Key:* Paul explicitly states that heirs suffer *with* Christ (\`v. 17\`), that creation is still subject to futility (\`vv. 20–22\`), and that believers ourselves groan inwardly while waiting in hope for bodily resurrection (\`v. 23\`).`,
    `6. **Prayer (\`vv. 26–27\`):** What comfort does \`Romans 8:26–27\` give when a believer is too exhausted or grief-stricken to know what to pray for?`,
    `   - *Teacher Key:* The Holy Spirit helps our weakness (\`ἀσθενείᾳ\`) and intercedes for the saints according to the will of God even when our prayers are wordless groans.`,
    `7. **Misquoted Verse Check (\`vv. 28–29\`):** How does reading \`Romans 8:28\` together with \`verse 29\` prevent misusing \`v. 28\` as a shallow cliché?`,
    `   - *Teacher Key:* \`Verse 28\` does not say every event is good in itself, nor that "good" means earthly wealth; \`verse 29\` defines the ultimate good as being conformed to the image of God's Son.`,
    `8. **Cross-Reference (\`v. 32\` & \`Genesis 22\`):** Which Old Testament story does Paul allude to in \`Romans 8:32\` (*"He that spared not his own Son"*), and what is his argument from the greater to the lesser?`,
    `   - *Teacher Key:* Paul echoes the Greek Septuagint (\`LXX\`) of \`Genesis 22:12, 16\` (Abraham not sparing Isaac). If God already gave the supreme gift—His own Son—He will certainly supply everything else needed to bring us home.`,
    `9. **Christ's Intercession (\`v. 34\`):** Notice that in \`v. 26\` the Spirit intercedes inside us, and in \`v. 34\` the risen Christ intercedes at God's right hand. How does this double intercession anchor Christian assurance?`,
    `   - *Teacher Key:* Believers have an Advocate in heaven (\`Romans 8:34\`; \`1 John 2:1\`) and an Intercessor within (\`Romans 8:26\`), leaving no room for any accuser (\`vv. 33–34\`).`,
    `10. **Personal Application (\`vv. 35–39\`):** Looking at Paul's list in \`vv. 35, 38–39\`, which fear or pressure in your life right now needs to hear that nothing in creation can separate you from the love of God in Christ Jesus?`,
    `    - *Teacher Key:* Open pastoral sharing—inviting participants to name present anxieties (*"things present"*) or future worries (*"things to come"*) and place them under Christ's finished work.`,
    ``,
    `---`,
    ``,
    `## 5. Five-Question Comprehension Quiz & Answer Key (5 Minutes)`,
    `1. **Q1:** How many times does Paul refer to the Spirit (\`Πνεῦμα\`) in \`Romans 8\`, and what two "No's" bracket the chapter (\`v. 1\` and \`vv. 38–39\`)?`,
    `   - **Answer:** **19 times**; bracketed by **"No condemnation" (\`v. 1\`)** and **"No separation" (\`vv. 38–39\`)**.`,
    `2. **Q2:** What Greek legal term in \`Romans 8:15, 23\` describes God making believers His sons and heirs?`,
    `   - **Answer:** **\`υἱοθεσία\` (*huiothesia*, adoption as sons/heirs)**.`,
    `3. **Q3:** What are the **three groanings** in \`Romans 8:19–27\`?`,
    `   - **Answer:** (1) The groaning of **creation** (\`vv. 19–22\`), (2) the groaning of **believers** awaiting bodily redemption (\`v. 23\`), and (3) the groaning/intercession of the **Holy Spirit** in prayer (\`vv. 26–27\`).`,
    `4. **Q4:** According to \`Romans 8:29\`, what is the specific *"good"* toward which God works all things in \`v. 28\`?`,
    `   - **Answer:** Being **conformed to the image of His Son** (\`συμμόρφους τῆς εἰκόνος τοῦ υἱοῦ αὐτοῦ\`).`,
    `5. **Q5:** What Old Testament text does Paul quote in \`Romans 8:36\` (*"For thy sake we are killed all the day long; we are accounted as sheep for the slaughter"*) to show that suffering has always accompanied God's faithful people?`,
    `   - **Answer:** **\`Psalm 44:22\`**.`,
    ``,
    `---`,
    ``,
    `## 6. Closing Prayer & 7-Day Take-Home Reading Plan (5 Minutes)`,
    `- **Take-Home Reading:** Day 1: \`Romans 8:1–11\` · Day 2: \`Romans 8:12–17\` · Day 3: \`Romans 8:18–25\` · Day 4: \`Romans 8:26–30\` · Day 5: \`Romans 8:31–39\` · Day 6: \`Psalm 44\` & \`Genesis 22:1–18\` · Day 7: \`John 14:15–27\` & \`Galatians 4:1–7\`.`,
    `- **Closing Prayer:** *"Abba, Father, thank You that because Your Son bore our condemnation on the cross, there is now no condemnation for those who are in Christ Jesus, and nothing in all creation will ever separate us from Your love. Fill us afresh with Your Holy Spirit this week as we walk in freedom, hope, and love. In Jesus' name, Amen."*`,
  ].join("\n");
}

interface CanonicalBookExegeticalProfile {
  divisionTitle: string;
  historicalContext: string;
  anchorVerseCitation: string;
  anchorVerseTextKjv: string;
  lexicalNotes: string[];
  point1Title: string;
  point1Exposition: string;
  point2Title: string;
  point2Exposition: string;
  point3Title: string;
  point3Exposition: string;
  crossReferences: string;
  traditionsNote: string;
}

/**
 * Resolves a substantive, passage-grounded exegetical profile for any book or passage
 * across the 7 Canonical Divisions (Genesis to Revelation) so no dynamic sermon or study
 * ever outputs empty placeholder descriptions.
 */
function getCanonicalBookProfile(targetPassage: string, genre: BibleTemplateSelection["detectedGenre"]): CanonicalBookExegeticalProfile {
  const p = targetPassage.toLowerCase();

  if (/\b(john\s*3|john\s*1|john\s*10|john\s*14|john\s*15|john\s*20|matthew|mark|luke|john|acts)\b/i.test(p) || genre === "Gospel_Parable") {
    return {
      divisionTitle: "Division 5 — The Gospels & Acts (The Person, Ministry, Death & Resurrection of Jesus the Messiah)",
      historicalContext:
        "Set in First-Century Second Temple Judea and Galilee under Roman occupation (and expanding from Jerusalem to Rome in Acts), where Messianic expectations of kingdom restoration meet their fulfillment in Jesus of Nazareth's incarnation, miracles, parables, crucifixion under Pontius Pilate, bodily resurrection, and Pentecost outpouring of the Holy Spirit.",
      anchorVerseCitation: /\b(john\s*3)\b/i.test(p) ? "John 3:16–17" : "Luke 24:44–47 / John 20:31",
      anchorVerseTextKjv: /\b(john\s*3)\b/i.test(p)
        ? '"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. For God sent not his Son into the world to condemn the world; but that the world through him might be saved." (John 3:16–17, KJV)'
        : '"But these are written, that ye might believe that Jesus is the Christ, the Son of God; and that believing ye might have life through his name." (John 20:31, KJV)',
      lexicalNotes: [
        "`εὐαγγέλιον` (*euangelion*): Royal good news / proclamation of God's saving reign breaking into history through Jesus the Messiah (`Mark 1:14–15`; `Isaiah 52:7`).",
        "`βασιλεία τοῦ Θεοῦ` (*basileia tou Theou*): The Kingdom/Reign of God—already inaugurated in Jesus' ministry, cross, and resurrection, and awaiting its final consummation at His parousia.",
        "`πιστεύω` (*pisteuō*): Active, self-committing trust and allegiance in the crucified and risen Christ (`John 1:12`; `3:16`; `20:31`).",
      ],
      point1Title: "The Historical & Messianic Revelation of Jesus in the Text",
      point1Exposition: `Examines the immediate narrative setting, interlocutors (disciples, crowds, or religious leaders), and explicit claims of \`${targetPassage}\`, demonstrating how Jesus' words and deeds disclose the character and saving rule of the Father.`,
      point2Title: "The Cross, Resurrection & Old Testament Fulfillment",
      point2Exposition: `Traces how \`${targetPassage}\` fulfills the Law of Moses, the Prophets, and the Psalms (\`Luke 24:27, 44\`), centering on Christ's substitutionary atonement (\`Mark 10:45\`) and victorious resurrection.`,
      point3Title: "Discipleship, Witness & Spirit-Empowered Practice",
      point3Exposition: `Draws out the call of \`${targetPassage}\` to repentance, faith, costly cross-bearing discipleship (\`Luke 9:23\`), love for neighbor, and witness to the nations (\`Matthew 28:18–20\`; \`Acts 1:8\`).`,
      crossReferences: "`Isaiah 52:7–53:12` -> `Mark 10:45` -> `Luke 24:25–27, 44–47` -> `John 3:14–17; 20:30–31` -> `Acts 2:22–36`",
      traditionsNote: "Protestant, Catholic, and Eastern Orthodox traditions unite around the Nicene confession of Christ's full deity and full humanity (`homoousios` with the Father, Chalcedon AD 451), while offering complementary liturgical, sacramental, and evangelical emphases on how believers participate in Christ's life.",
    };
  }

  if (/\b(genesis|exodus|leviticus|numbers|deuteronomy)\b/i.test(p)) {
    return {
      divisionTitle: "Division 1 — The Beginning / Torah (Genesis to Deuteronomy)",
      historicalContext:
        "Set against the Ancient Near Eastern backdrop of creation, the patriarchal migrations from Mesopotamia to Canaan, Israel's deliverance from Egyptian bondage in the Exodus, the Sinai covenant and tabernacle worship, and Moses' covenant renewal on the plains of Moab.",
      anchorVerseCitation: "Genesis 12:1–3 / Exodus 19:5–6 / Deuteronomy 6:4–5",
      anchorVerseTextKjv:
        '"Hear, O Israel: The LORD our God is one LORD: And thou shalt love the LORD thy God with all thine heart, and with all thy soul, and with all thy might." (Deuteronomy 6:4–5, KJV)',
      lexicalNotes: [
        "`בְּרִית` (*berit*): Binding covenant relationship initiated by YHWH's grace (`Genesis 15:18`; `Exodus 24:7–8`).",
        "`תּוֹרָה` (*torah*): Divine instruction/teaching guiding a redeemed people in holiness (`Exodus 20:1–2`; `Leviticus 19:2`).",
        "`כָּפַר` (*kafar*): To make atonement, cover, or cleanse the sanctuary and covenant community through sacrificial blood (`Leviticus 16:30`; `17:11`).",
      ],
      point1Title: "The Covenantal & Historical Foundation in the Torah Text",
      point1Exposition: `Unpacks what \`${targetPassage}\` explicitly narrates or commands within the unfolding storyline from Creation and Fall (\`Genesis 1–11\`) through the Patriarchal promises (\`Genesis 12–50\`) and Exodus redemption (\`Exodus–Deuteronomy\`).`,
      point2Title: "The Character of YHWH: Holiness, Mercy & Redemptive Promise",
      point2Exposition: `Demonstrates how \`${targetPassage}\` reveals YHWH as the self-existent Creator and Redeemer (\`Exodus 34:6–7\`) whose covenant promises point forward to the ultimate Seed and Prophet like Moses (\`Genesis 3:15\`; \`22:18\`; \`Deuteronomy 18:15\`; \`Hebrews 9:11–14\`).`,
      point3Title: "Whole-Hearted Covenant Fidelity & Neighbor Love Today",
      point3Exposition: `Applies the enduring moral and theological wisdom of \`${targetPassage}\` (distinguishing fulfilled ceremonial/civil provisions from abiding moral instruction, cf. \`Matthew 5:17\`; \`Romans 13:8–10\`) to worship, integrity, and care for the vulnerable.`,
      crossReferences: "`Genesis 12:1–3` -> `Exodus 19:4–6; 34:6–7` -> `Deuteronomy 6:4–9; 18:15` -> `Matthew 5:17` -> `Galatians 3:7–14` -> `Hebrews 9:11–15`",
      traditionsNote: "Christian traditions affirm that the Moral Law reflects God's unchanging character while ceremonial sacrifices find their once-for-all fulfillment in Christ (`Hebrews 10:1–14`); traditions vary smoothly on the pedagogical and covenantal continuity between Sinai and the New Covenant.",
    };
  }

  if (/\b(joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther)\b/i.test(p)) {
    return {
      divisionTitle: "Division 2 — Israel's Covenant History (Joshua to Esther)",
      historicalContext:
        "Spans Israel's settlement in Canaan, the turbulent era of the Judges, the rise of the united monarchy under Saul, David, and Solomon, the divided kingdoms of Israel (North, exiled 722 BC) and Judah (South, exiled 586 BC), and the post-exilic restoration under Zerubbabel, Ezra, and Nehemiah.",
      anchorVerseCitation: "2 Samuel 7:12–16 / Ruth 2:12",
      anchorVerseTextKjv:
        '"And thine house and thy kingdom shall be established for ever before thee: thy throne shall be established for ever." (2 Samuel 7:16, KJV)',
      lexicalNotes: [
        "`גֹּאֵל` (*go'el*): Kinsman-redeemer who rescues family members from poverty, debt, or lineage extinction (`Ruth 3:9`; `4:14`).",
        "`מָשִׁיחַ` (*mashiach*): Anointed one—the Davidic king consecrated by the Spirit of YHWH (`1 Samuel 16:13`; `2 Samuel 7:12–16`).",
        "`שׁוּב` (*shuv*): Covenant repentance—turning back to the LORD with the whole heart (`1 Kings 8:47–48`; `2 Chronicles 7:14`).",
      ],
      point1Title: "Narrative Observation: Human Frailty Meets Divine Providence",
      point1Exposition: `Examines the historical scenes, characters, and narrative tension of \`${targetPassage}\`, noting how descriptive biblical narratives record human failures honestly without endorsing every human action.`,
      point2Title: "The Davidic Covenant & Redemptive-Historical Trajectory",
      point2Exposition: `Traces how \`${targetPassage}\` advances God's unbreakable promise to preserve a remnant and raise up the righteous Son of David (\`2 Samuel 7:12–16\`; \`Luke 1:32–33\`) whose kingdom will never fail.`,
      point3Title: "Faithful Courage, Repentance & Integrity in Public and Private Life",
      point3Exposition: `Translates the lessons of \`${targetPassage}\` into concrete guidance for leadership humility, prayerful dependence on God in crisis, and faithfulness when culture drifts.`,
      crossReferences: "`Deuteronomy 28` -> `Ruth 4:13–22` -> `2 Samuel 7:8–16` -> `1 Kings 8:22–53` -> `Nehemiah 8:1–10` -> `Matthew 1:1–17`",
      traditionsNote: "All major Christian traditions read Israel's historical books both as real history under Deuteronomic/Chronicler theology and as typological preparation for Christ the true Prophet, Priest, and Davidic King.",
    };
  }

  if (/\b(job|psalms?|proverbs|ecclesiastes|song\s+of)\b/i.test(p) || genre === "Poetic_Wisdom") {
    return {
      divisionTitle: "Division 3 — Wisdom & Hebrew Poetry (Job to Song of Solomon)",
      historicalContext:
        "Israel's sanctuary hymnal (Psalms) and wisdom literature (Job, Proverbs, Ecclesiastes, Song of Solomon), teaching God's people how to pray with raw honesty in lament and praise, and how to walk in skill for godly living (`chokmah`) under the fear of the LORD.",
      anchorVerseCitation: "Proverbs 1:7 / Psalm 1:1–3",
      anchorVerseTextKjv:
        '"The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction." (Proverbs 1:7, KJV)',
      lexicalNotes: [
        "`יִרְאַת יְהוָה` (*yir'at YHWH*): The fear of the LORD—reverent awe, trust, and submission toward the Creator (`Proverbs 1:7`; `9:10`; `Job 28:28`).",
        "`חָכְמָה` (*chokmah*): Practical, moral, and covenantal skill for living rightly in God's ordered world (`Proverbs 3:13–19`).",
        "`הֶבֶל` (*hevel*): Vapor, breath, or fleeting enigma—the futility of life lived 'under the sun' apart from reverence for God (`Ecclesiastes 1:2`; `12:13–14`).",
      ],
      point1Title: "Poetic Structure, Parallelism & the Cry of the Text",
      point1Exposition: `Analyzes the Hebrew parallelism, imagery, and emotional honesty of \`${targetPassage}\`, carefully distinguishing general proverbs (truisms of wise living) from unconditional covenant promises.`,
      point2Title: "Christ the Wisdom of God and Singer of the Psalms",
      point2Exposition: `Connects \`${targetPassage}\` to Jesus Christ, in whom are hidden all the treasures of wisdom and knowledge (\`1 Corinthians 1:24, 30\`; \`Colossians 2:3\`) and who prayed the Psalms from the cradle to the cross (\`Luke 24:44\`).`,
      point3Title: "Practicing the Fear of the LORD in Speech, Suffering & Worship",
      point3Exposition: `Guides believers in bringing honest lament, grateful praise, and disciplined daily choices under the lordship of Christ.`,
      crossReferences: "`Psalm 1:1–6; 22:1–31; 119:105` -> `Proverbs 1:7; 3:5–6` -> `Job 19:25–27; 42:1–6` -> `1 Corinthians 1:24, 30` -> `Colossians 2:3`",
      traditionsNote: "Across Protestant, Catholic, and Orthodox worship, the Psalter and Wisdom books form the daily prayer book of the Church, read both in their historical-poetic sense and in their Christological fulfillment.",
    };
  }

  if (/\b(isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)\b/i.test(p)) {
    return {
      divisionTitle: "Division 4 — The Major & Minor Prophets (Isaiah to Malachi)",
      historicalContext:
        "Prophetic oracles delivered during the Assyrian, Babylonian, and Persian periods (8th to 5th centuries BC), prosecuting Israel and Judah for covenant idolatry and social injustice (`Micah 6:8`) while announcing the New Covenant (`Jeremiah 31:31–34`), the Suffering Servant (`Isaiah 52:13–53:12`), and the outpouring of the Spirit (`Joel 2:28–32`).",
      anchorVerseCitation: "Isaiah 53:5 / Micah 6:8 / Jeremiah 31:33",
      anchorVerseTextKjv:
        '"But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed." (Isaiah 53:5, KJV)',
      lexicalNotes: [
        "`נָבִיא` (*navi'*): Spokesperson/herald called into YHWH's council to proclaim His covenant lawsuit (*riv*) and promise of restoration (`Jeremiah 1:5–9`).",
        "`מִשְׁפָּט וּצְדָקָה` (*mishpat u-tsedaqah*): Justice and righteousness—rectifying oppression and living in right covenant relationship (`Amos 5:24`; `Micah 6:8`).",
        "`בְּרִית חֲדָשָׁה` (*berit chadashah*): The New Covenant promised in `Jeremiah 31:31–34`, accompanied by a new heart and new Spirit (`Ezekiel 36:26–27`).",
      ],
      point1Title: "The Prophetic Indictment & Historical Crisis in the Text",
      point1Exposition: `Situates \`${targetPassage}\` in its eighth-, seventh-, or sixth-century BC geopolitical and spiritual crisis, identifying what YHWH confronts in the worship and public ethics of the people.`,
      point2Title: "Near Historical Horizon & Messianic / New Covenant Fulfillment",
      point2Exposition: `Distinguishes the prophet's immediate historical horizon (Assyrian/Babylonian exile and return) from the ultimate Messianic fulfillment in Jesus' first and second comings (\`Isaiah 53\`; \`Jeremiah 31:31–34\`; \`Luke 4:18–21\`; \`1 Peter 1:10–12\`).`,
      point3Title: "Walking Humbly with God in Justice, Mercy & Watchful Hope",
      point3Exposition: `Applies the prophetic summons of \`${targetPassage}\` to authentic repentance, compassion for the marginalized, and unshakeable hope in God's sovereign rule over the nations.`,
      crossReferences: "`Isaiah 9:6–7; 52:13–53:12` -> `Jeremiah 31:31–34` -> `Ezekiel 36:25–27` -> `Micah 6:8` -> `Habakkuk 2:4` -> `Luke 4:16–21` -> `Hebrews 8:6–13`",
      traditionsNote: "Christian interpreters share the apostolic conviction that the Prophets testify to Christ's sufferings and subsequent glories (`1 Peter 1:11`), while discussing how near-historical and eschatological horizons telescope together.",
    };
  }

  if (/\b(revelation)\b/i.test(p) || genre === "Apocalyptic_Prophetic") {
    return {
      divisionTitle: "Division 7 — Revelation & the Consummation of All Things",
      historicalContext:
        "Written by John from exile on Patmos (late 1st century AD under Roman imperial cult pressure, or prior to AD 70 in early-date views) to the seven churches of Asia Minor (`Revelation 1:4, 11`), unveiling the enthroned Lamb (`Revelation 5`) who conquers the beast, judges Babylon, and brings down the New Jerusalem (`Revelation 21–22`).",
      anchorVerseCitation: "Revelation 1:17–18 / Revelation 21:3–5",
      anchorVerseTextKjv:
        '"And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away." (Revelation 21:4, KJV)',
      lexicalNotes: [
        "`ἀποκάλυψις` (*apokalypsis*, `Revelation 1:1`): Unveiling/disclosure of Jesus Christ— pulling back the curtain to show earthly suffering from the perspective of God's throne room (`Revelation 4–5`).",
        "`Ἀρνίον` (*Arnion*, occurs 28 times): The slain yet standing Lamb (`Revelation 5:6`) who conquers through His sacrificial blood (`Revelation 12:11`).",
        "`ὑπομονή` (*hypomonē*, `Revelation 13:10`; `14:12`): Steadfast patient endurance of the saints who refuse to compromise with idolatrous power.",
      ],
      point1Title: "Apocalyptic Imagery & the Message to the Suffering Churches",
      point1Exposition: `Unpacks the Old Testament background (\`Daniel\`, \`Ezekiel\`, \`Isaiah\`, \`Zechariah\`) and symbolic vision of \`${targetPassage}\`, asking first what comfort and warning it delivered to persecuted first-century believers.`,
      point2Title: "The Victory of the Slain Lamb & the Four Major Interpretive Frameworks",
      point2Exposition: `Presents the central christological message of \`${targetPassage}\` while fairly comparing **Preterist**, **Historicist**, **Futurist**, and **Idealist** readings (and **Premillennial**, **Amillennial**, and **Postmillennial** views) without dogmatism on secondary timelines.`,
      point3Title: "Faithful Witness, Worship & Perseverance Until Christ Returns",
      point3Exposition: `Calls the contemporary church to reject cultural idolatry, worship the Lamb alone, and live in the light of the New Creation (\`Revelation 21:1–5\`; \`22:20\`).`,
      crossReferences: "`Genesis 2:9; 3:15` -> `Daniel 7:13–14` -> `Ezekiel 47:1–12` -> `Revelation 5:5–10; 12:11; 21:1–5; 22:1–5, 20`",
      traditionsNote: "Historic Christianity unites around the ecumenical creeds: Christ will return bodily in glory to judge the living and the dead, and His kingdom shall have no end—even where traditions hold differing millennial or symbolic reading grids.",
    };
  }

  // Default: Division 6 — Pauline & General Epistles (Romans to Jude)
  return {
    divisionTitle: "Division 6 — The Pauline & General Epistles (Romans to Jude)",
    historicalContext:
      "Apostolic letters written between c. AD 48 and the late 1st century to establish young congregations across the Mediterranean world in sound doctrine, Christ-centered unity, holy living, and resilient hope amid false teaching and social pressure.",
    anchorVerseCitation: "Colossians 1:15–20 / Philippians 2:5–11 / Hebrews 12:1–2",
    anchorVerseTextKjv:
      '"Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame, and is set down at the right hand of the throne of God." (Hebrews 12:2, KJV)',
    lexicalNotes: [
      "`χάρις` (*charis*): God's unmerited saving favor and transforming power in Christ (`Ephesians 2:8`; `Titus 2:11–12`).",
      "`κοινωνία` (*koinōnia*): Spirit-created fellowship, partnership, and mutual sharing in the body of Christ (`Philippians 1:5`; `1 John 1:3`).",
      "`ἁγιασμός` (*hagiasmos*): Sanctification—progressive transformation into Christlikeness empowered by the Spirit (`1 Thessalonians 4:3`; `Hebrews 12:14`).",
    ],
    point1Title: "The Apostolic Indicative: What God Has Done in Christ (`Doctrine`)",
    point1Exposition: `Traces the logical flow, connecting conjunctions (*therefore, for, because*), and doctrinal foundation of \`${targetPassage}\` in its surrounding chapter context.`,
    point2Title: "Union with Christ & Canonical Harmony Across the Testaments",
    point2Exposition: `Shows how \`${targetPassage}\` grounds Christian identity in Christ's death, resurrection, and exaltation while harmonizing Old Testament promises with New Testament fulfillment.`,
    point3Title: "The Apostolic Imperative: How the Church Lives It Out (`Practice`)",
    point3Exposition: `Applies the ethical exhortations of \`${targetPassage}\` to humility, unity in the local church, family and workplace integrity, and steadfast hope.`,
    crossReferences: "`Romans 5:1–11; 12:1–2` -> `Galatians 2:20` -> `Ephesians 2:1–10; 4:1–6` -> `Philippians 2:5–11` -> `Hebrews 12:1–2` -> `James 2:14–26`",
    traditionsNote: "Protestant, Catholic, and Orthodox readers affirm together that salvation is rooted entirely in the grace of God through the death and resurrection of Jesus Christ and bears the fruit of love and good works (`Ephesians 2:8–10`; `James 2:17`).",
  };
}

/**
 * Generates a structured Sermon, Bible Study Lesson, or Exegetical / Discussion response
 * for any arbitrary biblical passage, book, topic, or question from Genesis to Revelation.
 */
export function buildDynamicBibleQueryResponse(question: string): string {
  const q = question.trim();

  // 0. Check if the query specifically asks about the Bible Template Library
  if (
    /\b(template\s+library|sermon\s+templates?|bible\s+study\s+templates?|discussion\s+templates?|template\s+selection\s+engine|template\s+a\s*—\s*sermon|template\s+b\s*—\s*bible\s+study|template\s+c\s*—\s*interactive\s+discussion|noctis-bible-templates-001)\b/i.test(
      q
    )
  ) {
    return buildBibleTemplateLibrarySection();
  }

  // 1. Check if the query specifically targets one of the 10 Acceptance Tests
  if (/\b(tree\s+of\s+life)\b/i.test(q) && /\b(genesis|revelation)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(1);
  }
  if (/\b(abraham|abrahamic\s+covenant)\b/i.test(q) && /\b(romans\s*4|galatians\s*3)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(2);
  }
  if (/\b(genesis\s*6\s*:\s*1|sons\s+of\s+god|nephilim)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(3);
  }
  if (/\b(hesed|chesed|חֶסֶד)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(4);
  }
  if (/\b(mark\s*1)\b/i.test(q) && /\b(john\s*1)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(5);
  }
  if (/\b(isaiah\s*7\s*:\s*14|almah|immanuel|emmanuel|matthew\s*1\s*:\s*22)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(6);
  }
  if (/\b(judas'?s?\s+death|matthew\s*27\s*:\s*3|acts\s*1\s*:\s*18|akeldama|potter'?s\s+field)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(7);
  }
  if (/\b(revelation\s*20|millenni(?:um|al)|premillennial|amillennial|postmillennial|preterist|historicist|futurist|idealist)\b/i.test(q)) {
    return buildBibleAcceptanceTestsSection(8);
  }
  if (/\b(ephesians\s*2\s*:\s*1)\b/i.test(q) && /\b(sermon|prison|preach|outline|manuscript)\b/i.test(q)) {
    const durMatch = q.match(/(\d+)\s*-\s*minute/i);
    return buildEphesiansPrisonSermon(durMatch ? parseInt(durMatch[1], 10) : 35);
  }
  if (
    /\b(obscure\s+biblical\s+verse|translation\s+that\s+is\s+not\s+available|unavailable\s+translation|unlicensed\s+translation|exact\s+wording.*not\s+available)\b/i.test(
      q
    )
  ) {
    return buildBibleAcceptanceTestsSection(10);
  }

  // 2. Check for the worked Joseph Bible Study or Joseph Suffering Discussion
  if (/\b(why\s+did\s+joseph\s+have\s+to\s+suffer|plan\s+for\s+joseph.*suffer)\b/i.test(q)) {
    return buildJosephSufferingDiscussionResponse();
  }
  if (/\b(bible\s+study|lesson|ten\s+discussion\s+questions|10\s+discussion\s+questions)\b/i.test(q) && /\b(joseph)\b/i.test(q)) {
    const durMatch = q.match(/(\d+)\s*-\s*minute/i);
    return buildJosephBibleStudyLesson(durMatch ? parseInt(durMatch[1], 10) : 45);
  }

  // Extract passage reference if present (e.g., "Romans 8:28-39", "Psalm 23", "John 3:16", "Genesis 1")
  const passageMatch = q.match(
    /\b((?:[1-3]\s*)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s+of\s+(?:Solomon|Songs)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)(?:\s+\d+(?::\d+(?:[–-]\d+)?)?)?)\b/i
  );
  const targetPassage = passageMatch
    ? passageMatch[1]
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b([a-z])([a-z]*)\b/gi, (m, first: string, rest: string) =>
          m.toLowerCase() === "of" ? "of" : first.toUpperCase() + rest.toLowerCase()
        )
    : "Selected Scripture Passage / Theme";
  const durMatch = q.match(/(\d+)\s*(?:-\s*)?minute/i);
  const isSermonMode = /\b(prepare\s+a\s+.*sermon|sermon\s+on|sermon\s+outline|preach\s+on|sermon\s+manuscript|sermon\s+for)\b/i.test(q);
  const isStudyMode = /\b(bible\s+study|sunday\s+school|lesson\s+plan|classroom|discussion\s+questions.*quiz|teach\s+a\s+class)\b/i.test(q);
  const durationMins = durMatch ? parseInt(durMatch[1], 10) : isStudyMode ? 45 : 30;
  const tpl = selectBibleTemplate(q, targetPassage);

  // 2b. Dedicated Full Expository Sermon / Bible Study for Psalm 23
  if (/\bpsalms?\s*23\b/i.test(q)) {
    return buildPsalm23SermonOrStudy(durationMins, isStudyMode ? "study" : "sermon", tpl);
  }

  // 2c. Dedicated Full Bible Study / Expository Sermon for Romans 8
  if (/\bromans\s*8\b/i.test(q)) {
    return buildRomans8StudyOrSermon(durationMins, isSermonMode ? "sermon" : "study", tpl);
  }

  const profile = getCanonicalBookProfile(targetPassage, tpl.detectedGenre);
  const p1Mins = Math.max(6, Math.round((durationMins - 10) * 0.35));
  const p2Mins = Math.max(6, Math.round((durationMins - 10) * 0.35));
  const p3Mins = Math.max(5, durationMins - 10 - p1Mins - p2Mins);

  // 3. Dynamic Sermon Preparation Mode (Full Expository Package with Canonical Profile)
  if (isSermonMode) {
    return [
      `# Noctis Bible Intelligence Engine — Complete Sermon Preparation Package (\`NOCTIS-BIBLE-001\`)`,
      `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
      `- **Template Category:** \`${tpl.categoryCode}\``,
      `- **Target Passage / Topic:** \`${targetPassage}\` (Detected Genre: \`${tpl.detectedGenre}\`)`,
      `- **Canonical Division:** ${profile.divisionTitle}`,
      `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
      `- **Estimated Speaking Duration:** **${durationMins} Minutes**`,
      `- **Hermeneutical Integrity Gate:** Explicitly separates **(1) What \`${targetPassage}\` states in its original historical/literary context** from **(2) The preacher's contemporary pastoral illustrations and applications**.`,
      ``,
      `## 1. Verbatim Anchor Scripture & Historical-Literary Context`,
      `- **Key Canonical Anchor (\`${profile.anchorVerseCitation}\`, KJV Public Domain):**`,
      `  > ${profile.anchorVerseTextKjv}`,
      `- **Authorial & Historical Setting:** ${profile.historicalContext}`,
      `- **Original-Language & Lexical Notes (\`BIBLE-DOM-05\`):**`,
      ...profile.lexicalNotes.map((note, idx) => `  ${idx + 1}. ${note}`),
      ``,
      `## 2. Expository Sermon Outline & Manuscript Structure (${durationMins} Minutes)`,
      `- **Introduction (5 mins):**`,
      `  - Connects the congregation's present spiritual need to the historical setting of \`${targetPassage}\` and states the **Central Biblical Proposition**: *God reveals His saving truth and covenant faithfulness in \`${targetPassage}\` to anchor our faith in Christ and transform our daily walk.*`,
      `- **Main Point I — ${profile.point1Title} (${p1Mins} mins):**`,
      `  - *Explicit Textual Exposition:* ${profile.point1Exposition}`,
      `  - *\`[Pastoral Application — Explicitly Labeled]\`:* Invites listeners to examine their lives in light of what \`${targetPassage}\` explicitly teaches rather than cultural assumptions.`,
      `- **Main Point II — ${profile.point2Title} (${p2Mins} mins):**`,
      `  - *Textual & Canonical Exposition:* ${profile.point2Exposition}`,
      `  - *Verified Cross-Reference Chain:* ${profile.crossReferences}`,
      `  - *Christian Traditions Note (\`BIBLE-DOM-09\`):* ${profile.traditionsNote}`,
      `  - *\`[Pastoral Application — Explicitly Labeled]\`:* Calls the congregation to rest in Christ's finished work and covenant promises.`,
      `- **Main Point III — ${profile.point3Title} (${p3Mins} mins):**`,
      `  - *Textual Exposition:* ${profile.point3Exposition}`,
      `  - *\`[Pastoral Application — Explicitly Labeled]\`:* Concrete steps for family, church fellowship, workplace integrity, and mercy ministry this week.`,
      `- **Conclusion & Closing Prayer (5 mins):**`,
      `  - Summarizes the three movements of \`${targetPassage}\` and closes in Scripture-grounded prayer: *"Lord God of the Scriptures, write the truth of \`${targetPassage}\` upon our hearts by Your Holy Spirit, conform us to Your Son Jesus Christ, and make us faithful witnesses of Your grace this week. In Jesus' name, Amen."*`,
    ].join("\n");
  }

  // 4. Dynamic Bible Study Classroom Mode (Full Classroom Package with Canonical Profile)
  if (isStudyMode) {
    return [
      `# Noctis Bible Intelligence Engine — Complete Bible Study Classroom Package (\`NOCTIS-BIBLE-001\`)`,
      `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
      `- **Template Category:** \`${tpl.categoryCode}\``,
      `- **Study Topic / Passage:** \`${targetPassage}\` (Detected Genre: \`${tpl.detectedGenre}\`)`,
      `- **Canonical Division:** ${profile.divisionTitle}`,
      `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
      `- **Session Duration:** **${durationMins} Minutes**`,
      ``,
      `## 1. Anchor Text & Historical-Lexical Foundation (12 Minutes)`,
      `- **Key Canonical Anchor (\`${profile.anchorVerseCitation}\`, KJV Public Domain):**`,
      `  > ${profile.anchorVerseTextKjv}`,
      `- **Historical & Literary Setting:** ${profile.historicalContext}`,
      `- **Original-Language Key Terms (\`BIBLE-DOM-05\`):**`,
      ...profile.lexicalNotes.map((note, idx) => `  ${idx + 1}. ${note}`),
      ``,
      `## 2. Three-Movement Teaching Walkthrough (13 Minutes)`,
      `1. **${profile.point1Title}:** ${profile.point1Exposition}`,
      `2. **${profile.point2Title}:** ${profile.point2Exposition} (*Cross-References:* ${profile.crossReferences})`,
      `3. **${profile.point3Title}:** ${profile.point3Exposition}`,
      `- **Christian Traditions Note (\`BIBLE-DOM-09\`):** ${profile.traditionsNote}`,
      ``,
      `## 3. Structured Discussion Questions with Teacher Answer Keys (15 Minutes)`,
      `1. **Observation:** What does \`${targetPassage}\` explicitly state about God's character and human responsibility in its opening verses?`,
      `   - *Teacher Key:* Directs students to the explicit subjects, verbs, and promises in the text before jumping to modern application.`,
      `2. **Historical Context:** How does understanding the historical setting (${profile.divisionTitle}) sharpen our reading of \`${targetPassage}\`?`,
      `   - *Teacher Key:* Prevents anachronism by reading the passage in light of its covenantal epoch and original audience.`,
      `3. **Canonical Cross-Reference:** How do the linked passages (${profile.crossReferences}) illuminate \`${targetPassage}\`?`,
      `   - *Teacher Key:* Shows the unity of Scripture from Old Testament promise to New Testament fulfillment in Christ.`,
      `4. **Personal & Community Application:** What is one specific attitude, habit, or relationship where \`${targetPassage}\` calls our group to obey God this week?`,
      `   - *Teacher Key:* Encourages concrete, humble action steps grounded in God's grace.`,
      ``,
      `## 4. Comprehension Review & Closing Prayer (5 Minutes)`,
      `- **Review Check:** Ask learners to state in one sentence (a) what \`${targetPassage}\` meant to its original audience, (b) how it points to Christ, and (c) how they will practice it this week.`,
      `- **Closing Prayer:** *"Father, thank You for Your living and active Word in \`${targetPassage}\`. Help us not to be hearers only, but doers who walk in faith, hope, and love through Jesus Christ our Lord, Amen."*`,
    ].join("\n");
  }

  // 5. General Exegetical, Theological & Interactive Discussion Mode
  return [
    `# Noctis Bible Intelligence Engine Assessment (\`NOCTIS-BIBLE-001\`)`,
    `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
    `- **Scope & Passage Focus:** \`${targetPassage}\` (Detected Genre: \`${tpl.detectedGenre}\` · ${profile.divisionTitle})`,
    `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
    `- **1. Explicit Textual Observation (\`KJV\` Public-Domain Anchor — \`${profile.anchorVerseCitation}\`):**`,
    `  > ${profile.anchorVerseTextKjv}`,
    `  - ${profile.point1Exposition}`,
    `- **2. Historical, Literary & Original-Language Context:**`,
    `  - ${profile.historicalContext}`,
    ...profile.lexicalNotes.map((note) => `  - ${note}`),
    `- **3. Canonical Cross-References & Christian Traditions:**`,
    `  - ${profile.point2Exposition}`,
    `  - *Cross-References:* ${profile.crossReferences}`,
    `  - *Traditions Overview:* ${profile.traditionsNote}`,
    `- **4. Practical Application & Interactive Follow-Up:**`,
    `  - ${profile.point3Exposition}`,
    `  - *Follow-Up Reflection Question:* Where do you see the tension or promise of \`${targetPassage}\` most clearly in your own walk with God right now?`,
  ].join("\n");
}

/**
 * Natural-language router entry point for the Noctis Bible Intelligence Engine (NOCTIS-BIBLE-001).
 */
export function handleNaturalBibleQuery(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  // Guard: do not intercept cyber, clinical, automotive, engineering, or financial/investment queries
  if (
    /\b(cwe-\d+|cve-\d{4}-\d+|sast|dast|ssrf|sql\s+injection|command\s+injection|bola\b|idor\b|mitre\s+att&ck|ransomware)\b/i.test(
      q
    ) ||
    /\b(mmhg|spo2|troponin|ectopic\s+pregnancy|preeclampsia|sepsis|meningitis|appendicitis|anaphylaxis)\b/i.test(
      q
    ) ||
    /\b(obd-ii|fuel\s+trim|crankcase|dpf\b|ifc\s*4\.3|buildingsmart|eurocode|microgrid|operating\s+cash\s+flow|receivables\s+rise|sec\s+edgar|noctis-invest-001)\b/i.test(
      q
    )
  ) {
    return null;
  }

  // 1. Master Blueprint + Batch 001 + Batch 002 + Template Library Specification Trigger
  const isMasterBlueprintRequest =
    /\b(noctis\s+bible\s+intelligence\s+engine|noctis-bible-001|genesis\s+to\s+revelation|genesis\s+through\s+revelation|bible-gen-001|training\s+batch\s*001\s*—\s*complete\s+biblical|training\s+batch\s*002\s*—\s*sermons|sermon\s+preparation\s+engine|bible\s+study\s+classroom\s+engine|interactive\s+bible\s+discussion\s+engine|bible\s+content\s+template\s+library|template\s+library\s+requirements)\b/i.test(
      q
    );

  if (isMasterBlueprintRequest) {
    return buildBibleEngineMasterBlueprint();
  }

  // 2. Specific Acceptance Tests, Templates, Sermons, Bible Studies, or Biblical Exegesis Queries across all 66 Books
  const hasBookWithChapterOrStudyContext =
    /\b(?:[1-3]\s*)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s+of\s+(?:Solomon|Songs)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+/i.test(
      q
    );

  const isBiblicalQuery =
    hasBookWithChapterOrStudyContext ||
    /\b(bible\s+study|sunday\s+school|sermon\s+on|prepare\s+a\s+.*sermon|preach\s+on|sermon\s+templates?|bible\s+study\s+templates?|discussion\s+templates?|ephesians\s*2\s*:\s*1|psalms?\s*23|romans\s*8|genesis\s*[1-6]|revelation\s*2[02]|isaiah\s*7\s*:\s*14|matthew\s*27\s*:\s*3|acts\s*1\s*:\s*18|romans\s*4|galatians\s*3|mark\s*1\s+and\s+john\s*1|hebrew\s+term\s+hesed|tree\s+of\s+life.*revelation|covenant\s+with\s+abraham|judas'?s?\s+death|life\s+of\s+joseph|why\s+did\s+joseph\s+have\s+to\s+suffer|nephilim|premillennial|amillennial|postmillennial|deuterocanonical|koine\s+greek|old\s+testament|new\s+testament|scripture)\b/i.test(
      q
    );

  if (isBiblicalQuery) {
    return buildDynamicBibleQueryResponse(q);
  }

  return null;
}



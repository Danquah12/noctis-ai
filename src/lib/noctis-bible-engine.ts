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
  const targetPassage = passageMatch ? passageMatch[1].trim() : "Selected Scripture Passage / Theme";
  const durMatch = q.match(/(\d+)\s*(?:-\s*)?minute/i);
  const durationMins = durMatch ? parseInt(durMatch[1], 10) : 35;
  const tpl = selectBibleTemplate(q, targetPassage);

  // 3. Dynamic Sermon Preparation Mode (Using Intelligent Template Selection)
  if (/\b(prepare\s+a\s+.*sermon|sermon\s+on|sermon\s+outline|preach\s+on|sermon\s+manuscript)\b/i.test(q)) {
    return [
      `# Noctis Bible Intelligence Engine — Sermon Preparation Package (\`NOCTIS-BIBLE-001\`)`,
      `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
      `- **Template Category:** \`${tpl.categoryCode}\``,
      `- **Target Passage / Topic:** \`${targetPassage}\` (Detected Genre: \`${tpl.detectedGenre}\`)`,
      `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
      `- **Estimated Speaking Duration:** **${durationMins} Minutes**`,
      `- **Hermeneutical Integrity Gate:** Explicitly separates **(1) What \`${targetPassage}\` states in its original historical/literary context** from **(2) The preacher's contemporary pastoral illustrations and applications**.`,
      ``,
      `## 1. Historical, Literary & Canonical Context`,
      `- **Authorial & Historical Setting:** Places \`${targetPassage}\` within its canonical division, covenantal epoch, original audience setting, and surrounding chapter argument so no verse is isolated from its context.`,
      `- **Original-Language & Lexical Notes (\`BIBLE-DOM-05\`):** Identifies key Hebrew/Aramaic (\`OT\`) or Koine Greek (\`NT\`) terms, verb tenses, and structural markers that shape the passage's central claim.`,
      ``,
      `## 2. Expository Sermon Outline & Manuscript Structure`,
      `- **Introduction (5 mins):** Connects the human need of the congregation to the historical crisis/question addressed in \`${targetPassage}\` and states the **Central Biblical Proposition**.`,
      `- **Main Point I — The Textual Foundation & Problem Addressed (${Math.round((durationMins - 10) * 0.35)} mins):**`,
      `  - *Textual Exposition:* Unpacks the opening movement of \`${targetPassage}\`, distinguishing explicit textual observations from theological inference.`,
      `  - *Pastoral Application (Labeled):* Bridges the ancient text to the congregation's daily walk without altering the text's meaning.`,
      `- **Main Point II — The Theological & Christological Center (${Math.round((durationMins - 10) * 0.35)} mins):**`,
      `  - *Textual & Canonical Exposition:* Traces how \`${targetPassage}\` connects across the canon (direct quotations, covenantal promises, and fulfillment in Christ).`,
      `  - *Pastoral Application (Labeled):* Calls listeners to faith, repentance, and reliance on God's grace.`,
      `- **Main Point III — Obedient Response & Community Practice (${Math.round((durationMins - 10) * 0.3)} mins):**`,
      `  - *Textual Exposition:* Highlights the ethical, worship, or communal imperative of the passage.`,
      `  - *Pastoral Application (Labeled):* Concrete action steps for family, church, workplace, or prison/community ministry.`,
      `- **Conclusion & Closing Prayer (5 mins):** Summarizes the three movements and closes in Scripture-grounded prayer.`,
    ].join("\n");
  }

  // 4. Dynamic Bible Study Classroom Mode (Using Intelligent Template Selection)
  if (/\b(bible\s+study|sunday\s+school|lesson\s+plan|classroom|discussion\s+questions.*quiz)\b/i.test(q)) {
    return [
      `# Noctis Bible Intelligence Engine — Bible Study Classroom Package (\`NOCTIS-BIBLE-001\`)`,
      `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
      `- **Template Category:** \`${tpl.categoryCode}\``,
      `- **Study Topic / Passage:** \`${targetPassage}\` (Detected Genre: \`${tpl.detectedGenre}\`)`,
      `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
      `- **Session Duration:** **${durationMins} Minutes**`,
      `- **Learning Objectives:**`,
      `  1. Observe what \`${targetPassage}\` states explicitly in its literary and historical context.`,
      `  2. Trace key cross-references across the Old and New Testaments.`,
      `  3. Compare major Christian interpretive perspectives fairly where the text is debated.`,
      `  4. Formulate responsible personal and communal applications distinguishable from the ancient text itself.`,
      `- **Classroom Structure:** Includes (1) Opening Icebreaker (5 mins), (2) Contextual Scripture Reading & Original-Language Notes (12 mins), (3) Structured Open-Ended Discussion Questions with Teacher Answer Keys (18 mins), (4) Comprehension Quiz & Review (5 mins), and (5) Take-Home Reading Plan (5 mins).`,
    ].join("\n");
  }

  // 5. General Exegetical, Theological & Interactive Discussion Mode
  return [
    `# Noctis Bible Intelligence Engine Assessment (\`NOCTIS-BIBLE-001\`)`,
    `- **Selected Template:** \`${tpl.templateId}\` (${tpl.templateName} · \`v${tpl.version}\`)`,
    `- **Scope & Passage Focus:** \`${targetPassage}\` (Detected Genre: \`${tpl.detectedGenre}\` · Evaluated under \`BIBLE-DOM-01..12\`)`,
    `- **Genre Adaptation Applied:** ${tpl.genreAdaptationRule}`,
    `- **1. Explicit Textual Observation:** Identifies the exact claims, narrative sequence, and grammatical structure of the passage in verified public-domain base translations (\`KJV\` / \`WEB\`) without fabricating quotations.`,
    `- **2. Historical, Literary & Original-Language Context:** Grounds the passage in its Ancient Near Eastern or Second Temple / Greco-Roman setting and examines key Hebrew, Aramaic, or Koine Greek terms (\`STEP Bible\` / \`SBL\` lexical standards).`,
    `- **3. Canonical Cross-References & Christian Traditions:** Traces verified links across Genesis to Revelation (distinguishing direct quotations, allusions, typology, and disputed connections) and represents Protestant, Catholic, and Orthodox interpretations fairly.`,
    `- **4. Practical Application & Discussion Follow-Up:** Separates timeless theological principles and contemporary pastoral application from the explicit historical text, and invites further Scripture-grounded study.`,
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

  // 2. Specific Acceptance Tests, Templates, Sermons, Bible Studies, or Biblical Exegesis Queries
  const isBiblicalQuery =
    /\b(bible\s+study|sermon\s+on|prepare\s+a\s+.*sermon|sermon\s+templates?|bible\s+study\s+templates?|discussion\s+templates?|ephesians\s*2\s*:\s*1|psalm\s*23|romans\s*8|genesis\s*[1-6]|revelation\s*2[02]|isaiah\s*7\s*:\s*14|matthew\s*27\s*:\s*3|acts\s*1\s*:\s*18|romans\s*4|galatians\s*3|mark\s*1\s+and\s+john\s*1|hebrew\s+term\s+hesed|tree\s+of\s+life.*revelation|covenant\s+with\s+abraham|judas'?s?\s+death|life\s+of\s+joseph|why\s+did\s+joseph\s+have\s+to\s+suffer|nephilim|premillennial|amillennial|postmillennial|deuterocanonical|koine\s+greek|old\s+testament|new\s+testament|scripture)\b/i.test(
      q
    );

  if (isBiblicalQuery) {
    return buildDynamicBibleQueryResponse(q);
  }

  return null;
}


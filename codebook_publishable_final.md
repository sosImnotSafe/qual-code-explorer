# Qualitative Analysis Codebook

## Terminology

- **Code family:** a top-level grouping of related codes.
- **Code:** an individual coding category within a code family.

## Code Families and Codes

### ATTITUDE

#### `ATTITUDE-AI-Negative`

A **general negative stance** toward AI or AI systems, beyond this specific reply.

#### `ATTITUDE-AI-Positive`

A **general positive stance** toward AI or AI systems.

#### `ATTITUDE-Conspiracy-Negative`

A **general negative stance** toward the conspiracy belief, conspiracy theories as a genre or conspiracy believers.

#### `ATTITUDE-Conspiracy-Positive`

A **general positive stance** toward the conspiracy belief or conspiracy theories as a genre.

#### `ATTITUDE-Media`

A **general stance** toward “the media” (mainstream, social, alternative, etc.) as institutions. Code when: They talk about media **in general**: trust/distrust, bias, manipulation, etc.

#### `ATTITUDE-Other`

Use **ATTITUDE-Other** when the speaker clearly expresses a **general stance or evaluation** (like/dislike, trust/distrust, respect/contempt) **but it is not about any other specific ATTITUDE- subcode**.

#### `ATTITUDE-Politics`

A **general stance** toward political actors, parties, or the political system.

#### `ATTITUDE-Science-Negative`

A **general negative stance** toward science or scientific institutions/methods.

#### `ATTITUDE-Science-Positive`

A **general positive stance** toward science or scientific institutions/methods.

### EVIDENCE

#### `EVIDENCE-Analogy`

Uses **analogies or comparisons** (often to other events) as evidence.

#### `EVIDENCE-Personal-Anecdote`

Uses **personal or specific stories** (self, friends, family) as evidence.

#### `EVIDENCE-Anomalies`

Use when the speaker treats **inconsistencies, gaps, or things that “don’t make sense”** as evidence for the conspiracy.

#### `EVIDENCE-Character-Credibility`

Uses **character/credibility of people** as the main basis of argument.

#### `EVIDENCE-Expert-Testimony`

Use **EVIDENCE-Expert-Testimony** when the speaker cites **a specific expert** as evidence. Refers to **a named or clearly identified expert individual or group.**

#### `EVIDENCE-Eyewitness`

Claims that someone directly **saw or heard** the relevant event.

#### `EVIDENCE-Media-or-Documents`

Refers to **articles, videos, leaked files, reports, documents** as evidence.

#### `EVIDENCE-Moral-Reasoning`

Uses **moral judgments** as part of what counts as proof (good/evil, right/wrong, harm).

#### `EVIDENCE-Motive`

Use **EVIDENCE-Motive** when the speaker reasons about **whether actors do or do not have a motive**, and uses that as evidence in favor of the conspiracy.

#### `EVIDENCE-Social-Proof`

Uses **what many others believe or do** as evidence.

#### `EVIDENCE-Statistics-or-Numbers`

Uses **numerical or quantitative claims** as evidence (accurate or not).

#### `EVIDENCE-Unspecified-Source`

Cites **vague or unnamed sources** as evidence.

### CONVERSATION

#### `CONVERSATION-Topic-Shift`

The speaker **shifts away from the current focal topic** to a different topic/conspiracy/issue.

#### `CONVERSATION-Counterargument`

Use **CONVERSATION-Counterargument** when the **user actively debates the AI’s arguments**, treating the conversation like a back-and-forth dispute and **bringing counter-arguments or counter-evidence specifically in response to what the AI said.**

#### `CONVERSATION-Shift-to-Values`

The speaker **shifts from factual reasoning to value-based talk** (identity, principles, morality) as the main focus.

#### `CONVERSATION-Follow-Up-Question`

Use **CONVERSATION-Follow-Up-Question** when the **user asks a question directly after an AI message** that **stays within the current topic** and **seeks clarification, elaboration, or more detail** about what the AI just said.

#### `CONVERSATION-New-Question`

Use **CONVERSATION-New-Question** when the **user asks a question after an AI message** that **introduces a new angle, topic, or issue.**

#### `CONVERSATION-Logical-Fallacy`

The **user** employs a clear logical fallacy as the main argumentative move.

#### `CONVERSATION-Source-Importance`

Use **CONVERSATION-Source-Importance** when the user gives **any clue that the *source* of information is itself important to them** — that they are the kind of person who **pays attention to where information comes from**, and this shapes their belief.

### FUTURE-STANCE

#### `FUTURE-STANCE-Hedging`

Use **FUTURE-STANCE-Hedging** when, by the end (or near the end) of the conversation, the **user does not clearly state either their current stance or their future stance**, and instead uses **vague, conditional, or non-committal language** about what they might think or do later.

#### `FUTURE-STANCE-Apathy`

(I Don’t Care) Expresses **future apathy or lack of motivation** to change or engage.

#### `FUTURE-STANCE-Moral-Commitment`

Future-oriented statements grounded in **moral commitments.**

#### `FUTURE-STANCE-Openness-to-Change`

Clearly states **willingness to reconsider, learn more, or potentially change** in the future.

### EMOTIONAL-RESPONSE

#### `EMOTIONAL-RESPONSE-General-Identity-or-Principles`

When the conversation **triggers emotion**, and the speaker responds by invoking **broad identities or principles** (without specifically moral or partisan emphasis).

#### `EMOTIONAL-RESPONSE-Morality`

Emotionally triggered invocation of **moral values** (good/evil, right/wrong, justice/injustice).

#### `EMOTIONAL-RESPONSE-Partisanship`

Emotionally triggered invocation of **parties, ideologies, or political camps** (“us vs them” politically).

### ENGAGEMENT

#### `ENGAGEMENT-Low-Attention`

Indicates **not fully attending to or engaging with the content**.

#### `ENGAGEMENT-Low-Connection`

Indicates that the speaker **does not feel a connection** with the AI’s argument or evidence — this can show up in their **tone of voice, point of view, or style of reaction**, not just in explicit statements about relevance.

### BELIEF-STATE

#### `BELIEF-STATE-Certain`

Explicit expression of **strong conviction right now** — *how certain they are* and **how strongly they insist on their claim**.

#### `BELIEF-STATE-Becoming-Uncertain`

The speaker moves from **prior confidence toward more uncertainty** during the conversation.

#### `BELIEF-STATE-Maintaining-Certainty`

Explicit commitment to **remain certain / not change** even after discussion.

#### `BELIEF-STATE-Repetition-or-Resistance`

The speaker **repeats their claim or resists counter-arguments**, signaling a stable stance.

#### `BELIEF-STATE-High-Investment`

Signals that the belief is **highly invested**: important to their identity/emotions **and/or** something they’ve put a lot of thought/reading/time into.

#### `BELIEF-STATE-Low-Investment`

Signals that the belief is **low investment**: not central, not heavily researched, more casual.

#### `BELIEF-STATE-High-Strength`

Indicates that the speaker sees the belief or argument as **very strong/likely** — an **indicator of belief strength** (*how possible/likely they see the claim*).

#### `BELIEF-STATE-Low-Strength`

Indicates that the speaker sees the belief or argument as **weak or unlikely** — low belief strength or low perceived support.

#### `BELIEF-STATE-Turning-Point`

Use **BELIEF-STATE-Turning-Point** for the **first moment in the conversation where the user shows signs of uncertainty or becoming less sure** about their belief. This code is used **at most once per conversation** and marks the **initial shift away from prior confidence**.

#### `BELIEF-STATE-Uncertain`

Expresses **doubt, ambivalence, or mixed feelings** about the belief.

### THEME

#### `THEME-Assassination`

Conspiracy is about **targeted killings, attempted killings, or suspicious deaths** of leaders, activists, or public figures.

#### `THEME-Corporate-Power`

Conspiracy centers on **companies or business entities** (pharma, tech, oil, banks, etc.) as primary actors planning, profiting, or colluding.

#### `THEME-Domestic-Politics`

About **national-level internal politics**: elections, domestic parties, national politicians, internal policy battles.

#### `THEME-Elite-Privilege`

Use **THEME-Elite-Privilege** when the conspiracy is about **certain powerful people (e.g., the ultra-rich, royalty, celebrities) using their extreme privilege, wealth, or status** to operate above the law, manipulate events, or get **unfair advantages/special treatment** in systems (like courts, government, or media) without facing normal consequences.

#### `THEME-Government-Cover-Up`

Core claim is that **official institutions are suppressing, denying, or manipulating information** to hide mistakes, scandals, crimes, or sensitive operations.

#### `THEME-Historical-Event`

Use **THEME-Historical-Event** when the conspiracy is about a **specific event that happened at a particular time** (or over a clearly bounded short period).

#### `THEME-International-Politics`

Focuses on **foreign governments, diplomacy, international organizations, or global agendas** (geopolitics across countries).

#### `THEME-Media`

Conspiracy centers on **media, entertainment, or information systems** as tools of control: propaganda, fake news, coordinated narratives, censorship, or manipulating what people see/hear. This includes faking events via **movie studios/film crews, staged crisis actors, social media bots, or scrubbing content** from the internet.

#### `THEME-Money-and-Power`

Use **THEME-Money-and-Power** when financial profit, economic control, or the retention of power is a **central mechanism** of the conspiracy (e.g., going to war for oil/defense contracts, suppressing cures to protect medical profits, paying people off to cover up crimes). Do **NOT** use simply because the actors are wealthy or powerful (e.g., 'the Rothschilds' or 'billionaires')—for that, use THEME-Elite-Privilege or THEME-Secret-Society instead.

#### `THEME-Science-and-Technology`

Centers on **medical, scientific, or technological deception.**

#### `THEME-Secret-Society`

Focuses on **shadowy or unofficial power structures** like secret societies, hidden cabals, deep state–style networks, or unnamed “they” that operate behind the scenes.

#### `THEME-Space-and-UFOs`

Involves **aliens, UFOs, secret space programs, or faked space missions**.

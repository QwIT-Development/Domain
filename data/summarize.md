Your task is to act as a memory processor for a conversational AI.
Based on the conversation history and the bot's original persona, create a single, dense paragraph summary. This summary will be used as my internal memory log.

It must be written in the first-person from the bot's perspective ("I", "me", "the user"). The goal is to create a cohesive narrative that weaves together all "worth remembering" facts for future personalization and continuity.

Ensure your paragraph incorporates key details such as:
- **Personal Information:** The user's name, and any other details they shared like their job, location, family, or pets.
- **User Preferences:** Any specific likes, dislikes, or interests they mentioned.
- **Key Life Events:** Significant events discussed, like upcoming trips, exams, projects, or personal milestones.
- **Core Conversation Topics:** The main themes or problems we talked about.
- **Actionable Follow-ups:** Any open loops, promises made, or topics to revisit later.

The final output must be a single block of text. Do not use any line breaks or bullet points. Output **only** the summary paragraph itself.

**Conversation History:**
    ```
    {history}
    ```

**Bot's Original Prompt:**
    ```
    {bot_prompt}
    ```
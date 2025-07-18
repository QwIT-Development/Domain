/*
        Domain-Unchained, src of the discord bot, that uses openai api to generate messages
        Copyright (C) 2025 Anchietae
*/

const { checkAuthors, checkForMentions } = require("../functions/checkAuthors");
const state = require("../initializers/state");
const log = require("../utils/betterLogs");
const { reputation } = require("../db/reputation");
const parseBotCommands = require("./botCommands");
const fs = require("fs");
const path = require("path");
const { RNGArray } = require("../functions/rng");
const uploadFilesToOpenAI = require("../eventHandlers/fileUploader");
const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();
const { formatDate } = require("../functions/makePrompt");
const { openai } = require("../initializers/openaiClient");
const { bondUpdater } = require("../functions/usageRep");
const { addToHistory, trimHistory } = require("../utils/historyUtils");

function simplifyEmoji(content) {
  // discord's custom emoji format: <:name:id>
  const customEmojiRegex = /<:(\w+):\d+>/g;
  // :name:
  content = content.replace(customEmojiRegex, ":$1:");
  const animatedEmojiRegex = /<a:(\w+):\d+>/g;
  content = content.replace(animatedEmojiRegex, ":$1:");
  return content;
}

async function formatUserMessage(message, repliedTo, replyReason = "") {
  const score = await reputation(message.author.id);
  const date = formatDate(new Date());
  let replyContent = "";
  let systemContext = "";
  if (repliedTo) {
    replyContent = `[Parent message from reply]
Author-ID: ${repliedTo.author.id}
Author-Username: ${repliedTo.author.username}
Author-DisplayName: ${repliedTo.member.displayName}
Content:
\`\`\`
${simplifyEmoji(repliedTo.content)}
\`\`\``;
  }
  if (replyReason?.length > 0) {
    systemContext = `--- System Context ---
${replyReason}\n`;
  }
  return `${systemContext}
--- Conversation History ---
${replyContent}

[Current message]
Author-ID: ${message.author.id}
Author-Username: ${message.author.username}
Author-DisplayName:: ${message.member.displayName}
Timestamp: ${date}
Reputation: ${score.toString()}
Content:
\`\`\`
${simplifyEmoji(message.content)}
\`\`\``;
}

async function callOpenAI(channelId, openaiConfig) {
  let responseMsg = "";
  let tool_calls = null;

  // Convert Gemini history format to OpenAI messages format
  const messages = [];
  
  // Add system message first
  if (state.prompts[channelId]) {
    messages.push({
      role: "system",
      content: state.prompts[channelId]
    });
  }
  
  // Convert history from Gemini format to OpenAI format
  for (let i = 0; i < state.history[channelId].length; i++) {
    const historyItem = state.history[channelId][i];
    const role = historyItem.role === "model" ? "assistant" : historyItem.role;
    const content = historyItem.parts?.[0]?.text || "";
    
    if (content) {
      // Check if this is the last user message and has image files
      if (i === state.history[channelId].length - 1 && 
          role === "user" && 
          historyItem.imageFiles && 
          historyItem.imageFiles.length > 0) {
        // For the latest message with images, create a complex content structure
        const messageContent = [
          {
            type: "text",
            text: content
          },
          ...historyItem.imageFiles
        ];
        
        messages.push({
          role: role,
          content: messageContent
        });
      } else {
        messages.push({
          role: role,
          content: content
        });
      }
    }
  }

  const requestBody = {
    model: config.OPENAI_MODEL,
    messages: messages,
    temperature: openaiConfig[channelId].temperature,
    top_p: openaiConfig[channelId].top_p,
    max_tokens: openaiConfig[channelId].max_tokens,
    stream: true,
  };
  
  if (openaiConfig[channelId].tools && openaiConfig[channelId].tools.length > 0) {
    requestBody.tools = openaiConfig[channelId].tools;
    requestBody.tool_choice = openaiConfig[channelId].tool_choice;
  }

  const response = await openai.chat.completions.create(requestBody);

  for await (const chunk of response) {
    const delta = chunk.choices?.[0]?.delta;
    if (delta?.tool_calls) {
      if (!tool_calls) {
        tool_calls = [];
      }
      // Handle tool calls accumulation for streaming
      for (const toolCall of delta.tool_calls) {
        if (!tool_calls[toolCall.index]) {
          tool_calls[toolCall.index] = {
            id: toolCall.id,
            type: toolCall.type,
            function: {
              name: toolCall.function?.name || "",
              arguments: toolCall.function?.arguments || ""
            }
          };
        } else {
          // Accumulate arguments for streaming
          if (toolCall.function?.arguments) {
            tool_calls[toolCall.index].function.arguments += toolCall.function.arguments;
          }
        }
      }
    } else if (delta?.content) {
      responseMsg += delta.content;
    }
  }

  if (tool_calls && tool_calls.length > 0) {
    return { tool_calls, text: responseMsg.trim() };
  }
  return { text: responseMsg.trim() };
}

async function handleOpenAIError(e, message, client, openaiConfig) {
  const errorJSON = JSON.parse(JSON.stringify(e));
  let status = errorJSON?.status || null;

  let statusMessage;
  try {
    let errorData = e.error instanceof Object ? e.error : e;

    if (
      errorData instanceof Object &&
      typeof errorData.message === "string" &&
      errorData.message.trim().startsWith("{")
    ) {
      try {
        const innerError = JSON.parse(errorData.message);
        if (innerError.error) {
          errorData = innerError.error;
        }
      } catch (parseError) {
        console.warn(
          "Could not parse inner JSON from error message:",
          parseError,
        );
      }
    }

    if (errorData instanceof Object) {
      status = errorData.code;
      try {
        statusMessage = errorData?.message?.error?.message; // weird ass json
      } catch (e) {
        statusMessage = "";
        console.warn(e.message);
      }
    } else if (errorData) {
      statusMessage = String(errorData);
    }
  } catch (extractError) {
    console.warn("Could not extract error details:", extractError);
  }

  // old handling, DO NOT REMOVE COMMENT
  const channelId = message.channel.id;
  /*let msg;
    try {
        if (e.response.promptFeedback.blockReason) {
            msg = e.response.promptFeedback.blockReason;
        }
    } catch { }

    if (msg && (msg === "SAFETY" || msg === "PROHIBITED_CONTENT" || msg === "OTHER")) {
        return message.channel.send(await RNGArray(state.strings.geminiFiltered));
    }*/

  // beggining of the new error handling
  if (status && (status === 429 || status === 500 || status === 503)) {
    let retryDelay;
    if (status === 429) {
      log(
        `OpenAI returned 429 (Rate Limited), attempting to retry after cooldown.`,
        "warn",
        "messageHandler.js",
      );
      let delaySeconds = 60;
      retryDelay = delaySeconds * 1000;
    } else {
      log(
        `OpenAI returned ${status} (${statusMessage}), retrying`,
        "warn",
        "messageHandler.js",
      );
      retryDelay = 3000;
    }
    if (!state.retryCounts[channelId]) {
      state.retryCounts[channelId] = 0;
    }
    state.retryCounts[channelId]++;
    if (state.retryCounts[channelId] > 5) {
      console.error(
        `OpenAI returned ${status} error 5 times for channel ${channelId}, dropping task`,
      );
      state.retryCounts[channelId] = 0;
      return message.channel.send("Couldn't get a response, try again later.");
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    return messageHandler(message, client, openaiConfig);
  } else {
    if (state.retryCounts[channelId]) {
      state.retryCounts[channelId] = 0;
    }
    console.error(
      `Unhandled OpenAI error. Status: ${status}. Message: ${statusMessage || "No message provided"}`,
    );
    if (e.stack) {
      console.error(e.stack);
    }
    await message.channel.send("Unhandled error. (Refer to console)");
  }
}

async function processResponse(responseMsg, message) {
  responseMsg = responseMsg.replaceAll("@everyone", "[blocked]");
  responseMsg = responseMsg.replaceAll("@here", "[blocked]");

  if (state.retryCounts[message.channel.id]) {
    state.retryCounts[message.channel.id] = 0;
  }

  responseMsg = responseMsg
    .replaceAll(
      /^\s*--- System Context ---\s*[\s\S]*?---\s*Conversation History\s*---[\s\S]*```\s*$/gim,
      "",
    )
    .trim();
  return responseMsg;
}

async function messageHandler(message, client, openaiConfig) {
  const channelId = message.channel.id;

  if (!state.messageQueues[channelId]) {
    state.messageQueues[channelId] = [];
  }

  state.messageQueues[channelId].push({ message, client, openaiConfig });

  if (state.isProcessing[channelId]) {
    return;
  }

  state.isProcessing[channelId] = true;

  try {
    while (
      state.messageQueues[channelId] &&
      state.messageQueues[channelId].length > 0
    ) {
      const task = state.messageQueues[channelId][0];
      try {
        await _internalMessageHandler(task.message, task.client, task.openaiConfig);
      } catch (e) {
        console.error(
          `Error processing message in queue for channel ${channelId}: ${e.stack}`,
        );
        try {
          await task.message.channel.send(
            "An unexpected error occurred while processing your message. Please try again later.",
          );
        } catch (sendError) {
          console.error(
            `Failed to send error message to channel ${channelId}: ${sendError}`,
          );
        }
      } finally {
        if (state.messageQueues[channelId]) {
          state.messageQueues[channelId].shift();
        }
      }
    }
  } finally {
    state.isProcessing[channelId] = false;
    if (
      state.messageQueues[channelId] &&
      state.messageQueues[channelId].length === 0
    ) {
      delete state.messageQueues[channelId];
    }
  }
}

async function _internalMessageHandler(message, client, openaiConfig) {
  if (!(await checkAuthors(message, client))) {
    return;
  }

  const channelId = message.channel.id;
  let repliedTo;
  try {
    if (message.reference?.messageId) {
      repliedTo = await message.channel.messages.fetch(
        message.reference.messageId,
      );
    }
  } catch (e) {
    log(`Failed to fetch replied message: ${e}`, "warn", "messageHandler.js");
  }

  const files = await uploadFilesToOpenAI(message, client);
  if (files.length > 0) {
    message.content += "[Attachment]";
  }

  const formattedMessage = await formatUserMessage(message, repliedTo);

  // add to history, bc contextual responding needs it
  addToHistory("user", formattedMessage, channelId);
  const mentioned = await checkForMentions(message, client);

  if (mentioned.shouldRespond) {
    // remove last message from history for better looks
    if (state.history[channelId] && state.history[channelId].length > 0) {
      state.history[channelId].pop();
    }
  } else {
    state.msgCount += 1;
    return;
  }

  const cronReset = require("../cronJobs/cronReset");
  cronReset.reschedule();

  await message.channel.sendTyping();
  state.msgCount += 1;

  let msgParts = [];
  if (files.length > 0) {
    // For OpenAI, we'll include images directly in the message content
    // Files are already in the correct format from uploadFilesToOpenAI
    for (const file of files) {
      msgParts.push(file);
    }
  }

  // Add text message
  msgParts.push({
    type: "text",
    text: await formatUserMessage(message, repliedTo, mentioned.respondReason),
  });

  await trimHistory(channelId);

  // Store the user message in history (just text for now, files handled separately in API calls)
  const userMessage = await formatUserMessage(message, repliedTo, mentioned.respondReason);
  state.history[channelId].push({
    role: "user",
    parts: [{ text: userMessage }],
    // Store file info separately for API calls
    imageFiles: files.length > 0 ? files : undefined
  });

  let initialResponse;
  try {
    initialResponse = await callOpenAI(channelId, openaiConfig);
  } catch (e) {
    return handleOpenAIError(e, message, client, openaiConfig);
  }

  const hasInitialText =
    initialResponse.text && initialResponse.text.trim().length > 0;
  const hasToolCalls =
    initialResponse.tool_calls && initialResponse.tool_calls.length > 0;

  if (hasToolCalls) {
    if (hasInitialText) {
      let processedInitialThought = await processResponse(
        initialResponse.text,
        message,
      );
      await addToHistory("model", processedInitialThought, channelId);
    }

    // Convert OpenAI tool_calls to Gemini-compatible format for backwards compatibility
    const convertedToolCalls = initialResponse.tool_calls.map((toolCall) => ({
      name: toolCall.function.name,
      args: JSON.parse(toolCall.function.arguments || '{}')
    }));

    state.history[channelId].push({
      role: "model", 
      parts: [{ text: initialResponse.text || "" }]
    });

    let toolResponses;
    try {
      toolResponses = await parseBotCommands(
        convertedToolCalls,
        message,
        openaiConfig,
      );
    } catch (e) {
      console.error(`Error executing parseBotCommands: ${e.stack}`);
      toolResponses = convertedToolCalls.map((fc) => ({
        name: fc.name,
        response: {
          content: `An internal error occurred while attempting to execute the tool: ${fc.name}.`,
        },
      }));
    }

    // Add tool responses to history - convert to format that historyUtils expects
    for (const toolResponse of toolResponses) {
      state.history[channelId].push({
        role: "user",
        parts: [{ text: `Tool response for ${toolResponse.name}: ${JSON.stringify(toolResponse.response)}` }]
      });
    }

    let subsequentResponse;
    try {
      subsequentResponse = await callOpenAI(channelId, openaiConfig);
    } catch (e) {
      return handleOpenAIError(e, message, client, openaiConfig);
    }
    let subsequentText = subsequentResponse.text || "";
    if (subsequentText.trim().length > 0) {
      subsequentText = await processResponse(subsequentText, message);
      await addToHistory("model", subsequentText, channelId);
      await chunkedMsg(message, subsequentText, mentioned.reply);
    }
    await trimHistory(channelId);
    await bondUpdater(message.author.id);
  } else if (hasInitialText) {
    let processedInitialText = await processResponse(
      initialResponse.text,
      message,
    );
    await addToHistory("model", processedInitialText, channelId);
    await chunkedMsg(message, processedInitialText, mentioned.reply);
    await trimHistory(channelId);
    await bondUpdater(message.author.id);
    return;
  } else {
    await addToHistory("model", "", channelId);
    await trimHistory(channelId);
    await bondUpdater(message.author.id);
    return;
  }
}

// longest function with 55 "Cognitive Complexity", good to go for now, also we need to take mute command apart, might be making a different module
async function chunkedMsg(message, response, reply = true) {
  // check if response empty
  if (response.trim().length === 0) {
    return;
  }

  const chunkSize = 2000;

  const codeBlockRegex = /```.*?```/gs;
  let codeBlock = "";
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    response = response.replace(match[0], "");
    match[0] = match[0].replace(/```\w*/gs, "");
    codeBlock += match[0] + "\n";
  }

  const artifactPath = path.join(
    global.dirname,
    "data",
    "running",
    "tmp",
    `artifact_${Date.now()}.txt`,
  );

  if (codeBlock.trim().length > 0) {
    try {
      fs.writeFileSync(artifactPath, codeBlock);
    } catch (e) {
      console.error(`Failed to save artifact: ${e}`);
    }
  }

  if (response.length <= chunkSize && response.trim().length > 0) {
    if (codeBlock.trim().length > 0) {
      try {
        if (reply) {
          await message.reply({
            content: response,
            files: [artifactPath],
          });
        } else {
          await message.channel.send({
            content: response,
            files: [artifactPath],
          });
        }
        fs.unlinkSync(artifactPath);
      } catch (e) {
        log(
          `Failed to send/reply to message (it may have been deleted): ${e}`,
          "warn",
          "messageHandler.js",
        );
        if (fs.existsSync(artifactPath)) {
          fs.unlinkSync(artifactPath);
        }
        return;
      }
    } else {
      try {
        if (reply) {
          await message.reply(response);
        } else {
          await message.channel.send(response);
        }
      } catch (e) {
        log(
          `Failed to send/reply to message (it may have been deleted): ${e}`,
          "warn",
          "messageHandler.js",
        );
        return;
      }
    }
    return true;
  }

  let chunks = [];
  let currChunk = "";

  const lines = response.split("\n");
  for (const line of lines) {
    if (
      currChunk.length + line.length + 1 > chunkSize &&
      currChunk.length > 0
    ) {
      chunks.push(currChunk);
      currChunk = "";
    }

    if (line.length > chunkSize) {
      if (currChunk.length > 0) {
        chunks.push(currChunk);
        currChunk = "";
      }

      for (let i = 0; i < line.length; i += chunkSize) {
        chunks.push(line.substring(i, i + chunkSize));
      }
    } else {
      currChunk += (currChunk ? "\n" : "") + line;
    }
  }

  if (currChunk.length > 0) {
    chunks.push(currChunk);
  }

  if (chunks.length > 0) {
    try {
      if (reply) {
        await message.reply(chunks[0]);
      } else {
        await message.channel.send(chunks[0]);
      }
    } catch (e) {
      log(
        `Failed to send/reply to message with the first chunk (it may have been deleted): ${e}`,
        "warn",
        "messageHandler.js",
      );
      if (codeBlock.trim().length > 0 && fs.existsSync(artifactPath)) {
        fs.unlinkSync(artifactPath);
      }
      return;
    }
    for (let i = 1; i < chunks.length; i++) {
      try {
        await message.channel.send(chunks[i]);
      } catch (e) {
        log(
          `Failed to send subsequent chunk: ${e}`,
          "warn",
          "messageHandler.js",
        );
        return;
      }
    }
  }

  if (codeBlock.trim().length > 0) {
    if (fs.existsSync(artifactPath)) {
      try {
        await message.channel.send({
          files: [artifactPath],
        });
      } catch (e) {
        log(`Failed to send artifact: ${e}`, "warn", "messageHandler.js");
      } finally {
        // delete artifact
        fs.unlinkSync(artifactPath);
      }
    }
  }

  return true;
}

module.exports = { messageHandler };

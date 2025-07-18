const { loadConfig } = require("../initializers/configuration");
const config = loadConfig();

const tools = [
  {
    type: "function",
    function: {
      name: "reputation",
      description: "Modifies the reputation of the message author",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["increase", "decrease"],
          },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mute",
      description:
        "Mutes the specified user. Select a predefined reason from `muteFor` for a default duration. To set a custom time, choose `Other` and specify the duration in the `seconds` parameter. An optional `reason` can be provided for logging.",
      parameters: {
        type: "object",
        properties: {
          userID: {
            type: "number",
          },
          reason: {
            type: "string",
          },
          muteFor: {
            type: "string",
            enum: [
              "Spam",
              "Inappropriate_Language",
              "Harassment",
              "Advertising",
              "Trolling",
              "Mass_Mentions",
              "Evading_Punishment",
              "Sharing_Personal_Information",
              "Raiding_and_Coordinated_Spam",
              "Other",
            ],
          },
          seconds: {
            type: "number",
          },
        },
        required: ["userID", "muteFor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "svg",
      description:
        'Generates a PNG image from the provided SVG code and sends it to the user. Your SVG code **MUST** start with a proper `<svg>` tag containing `width`, `height`, and `xmlns` attributes. `<svg width="..." height="..." xmlns="http://www.w3.org/2000/svg"> ... </svg>` The `width` and `height` attributes **MUST** be positive, non-zero numbers. Use `500` for both `width` and `height` as a reliable default (e.g., `width="500" height="500"`). Every element inside the SVG (like `<path>`, `<circle>`, `<rect>`, `<line>`) **MUST** be self-closing. This means it must end with ` />`.',
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
          },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description:
        "Performs a search using the given query and includes the result in the response",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory",
      description:
        "Stores a string for later recall, enhancing the ability to understand context in future interactions.",
      parameters: {
        type: "object",
        properties: {
          string: {
            type: "string",
          },
        },
        required: ["string"],
      },
    },
  },
  config.ALLOW_SANDBOX
    ? {
        type: "function",
        function: {
          name: "terminal",
          description:
            "Executes a shell command in an openSUSE Linux environment. This is useful for file system operations (creating, reading, writing files), running scripts, and other command-line tasks. The command's standard output and error will be returned.",
          parameters: {
            type: "object",
            properties: {
              command_string: {
                type: "string",
              },
            },
            required: ["command_string"],
          },
        },
      }
    : null,
].filter(Boolean);

module.exports = tools;

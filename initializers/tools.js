const { loadConfig } = require('../initializers/configuration');
const config = loadConfig();

const tools = [
  {
    functionDeclarations: [
      {
        "name": "reputation",
        "description": "Modifies the reputation of the message author",
        "parameters": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": [
                "increase",
                "decrease"
              ]
            }
          },
          "required": [
            "type"
          ]
        }
      },
      {
        "name": "mute",
        "description": "Mutes the specified user for the given time, with an optional reason.",
        "parameters": {
          "type": "object",
          "properties": {
            "userID": {
              "type": "number"
            },
            "seconds": {
              "type": "number"
            },
            "reason": {
              "type": "string"
            }
          },
          "required": [
            "userID",
            "seconds"
          ]
        }
      },
      {
        "name": "svg",
        "description": 'Generates a PNG image from the provided SVG code and sends it to the user. Your SVG code **MUST** start with a proper `<svg>` tag containing `width`, `height`, and `xmlns` attributes. `<svg width="..." height="..." xmlns="http://www.w3.org/2000/svg"> ... </svg>` The `width` and `height` attributes **MUST** be positive, non-zero numbers. Use `500` for both `width` and `height` as a reliable default (e.g., `width="500" height="500"`). Every element inside the SVG (like `<path>`, `<circle>`, `<rect>`, `<line>`) **MUST** be self-closing. This means it must end with ` />`.',
        "parameters": {
          "type": "object",
          "properties": {
            "code": {
              "type": "string"
            }
          },
          "required": [
            "code"
          ]
        }
      },
      {
        "name": "search",
        "description": "Performs a search using the given query and includes the result in the response",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string"
            }
          },
          "required": [
            "query"
          ]
        }
      },
      {
        "name": "memory",
        "description": "Stores a string for later recall, enhancing the ability to understand context in future interactions.",
        "parameters": {
          "type": "object",
          "properties": {
            "string": {
              "type": "string"
            }
          },
          "required": [
            "string"
          ]
        }
      },
      config.ALLOW_SANDBOX ? {
        "name": "terminal",
        "description": "Executes a shell command in an openSUSE Linux environment. This is useful for file system operations (creating, reading, writing files), running scripts, and other command-line tasks. The command's standard output and error will be returned.",
        "parameters": {
          "type": "object",
          "properties": {
            "command_string": {
              "type": "string"
            }
          },
          "required": [
            "command_string"
          ]
        }
      } : null,
    ].filter(Boolean)
  }
]

module.exports = tools;
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
        "description": "Generates a PNG image from the provided SVG code and sends it to the channel.",
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
        "description": "Saves a string to the bot's memory, associated with the current channel.",
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
      }
    ]
  }
]

module.exports = tools;
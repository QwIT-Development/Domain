const tool_mute =   {
    "name": "mute",
    "description": "Mute users for a given time (seconds are given in number only)",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {
                "type": "number"
            },
            "time": {
                "type": "number"
            },
            "reason": {
                "type": "string"
            }
        },
        "required": [
            "user_id",
            "time",
            "reason"
        ]
    }
}

const tool_reputation =   {
    "name": "reputation",
    "description": "increase/decrease current user's reputation points",
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
}

const tool_search =   {
    "name": "search",
    "description": "Search on the web",
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
}

module.exports = {tool_mute, tool_reputation, tool_search}
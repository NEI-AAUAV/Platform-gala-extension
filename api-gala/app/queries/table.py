# The number of confirmed persons
KEY_REDUCE = "$reduce"
KEY_INPUT = "input"
KEY_INITIAL_VALUE = "initialValue"
KEY_IN = "in"
KEY_ADD = "$add"
KEY_SIZE = "$size"
KEY_COND = "$cond"
KEY_VALUE = "$$value"
KEY_COMPANIONS = "$$this.companions"
KEY_PERSONS = "$persons"

num_confirmed_companions = {
    KEY_REDUCE: {
        KEY_INPUT: KEY_PERSONS,
        KEY_INITIAL_VALUE: 0,
        KEY_IN: {KEY_ADD: [KEY_VALUE, {KEY_SIZE: KEY_COMPANIONS}]},
    },
}

# The number of confirmed persons
num_confirmed_persons = {
    KEY_REDUCE: {
        KEY_INPUT: KEY_PERSONS,
        KEY_INITIAL_VALUE: 0,
        KEY_IN: {
            KEY_COND: {
                "if": "$$this.confirmed",
                "then": {KEY_ADD: [{KEY_SIZE: KEY_COMPANIONS}, KEY_VALUE, 1]},
                "else": KEY_VALUE,
            }
        },
    },
}

table_is_empty = {"$eq": [{KEY_SIZE: KEY_PERSONS}, 0]}

confirmed_persons_array = {
    "$filter": {
        KEY_INPUT: KEY_PERSONS,
        "as": "person",
        "cond": "$$person.confirmed",
    }
}

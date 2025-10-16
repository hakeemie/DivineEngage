export default {
  "divines": [
    {
      "id": "D1",
      "name": "Inferna",
      "element": "fire",
      "hp": 30,
      "image": "/cards/pyre.png",
      "transcend": "runes>=10",
      "transcendEffect": {
        "type": "double_damage"
      }
    },
    {
      "id": "D2",
      "name": "Aqualis",
      "element": "water",
      "hp": 30,
      "image": "/cards/tide.png",
      "transcend": "damageInTurn>=6",
      "transcendEffect": {
        "type": "double_discard"
      }
    },
    {
      "id": "D3",
      "name": "Verdara",
      "element": "grass",
      "hp": 30,
      "image": "/cards/verdant.png",
      "transcend": "drawn>=14",
      "transcendEffect": {
        "type": "set_rune_to_6"
      }
    }
  ],
  "followers": [
    {
      "id": "F1",
      "name": "Fire Card 1",
      "element": "fire",
      "attack": 3,
      "image": "/cards/F1.png",
      "abilities": [
        {
          "type": "damage",
          "value": 1
        }
      ]
    },
    {
      "id": "F2",
      "name": "Water Card 2",
      "element": "water",
      "attack": 2,
      "image": "/cards/F2.png",
      "abilities": [
        {
          "type": "draw",
          "value": 1
        }
      ]
    },
    {
      "id": "F3",
      "name": "Grass Card 3",
      "element": "grass",
      "attack": 1,
      "image": "/cards/F3.png",
      "abilities": [
        {
          "type": "discard",
          "value": 1
        }
      ]
    }
  ]
}
export default {
  "divines": [
    {
      "id": "D1",
      "name": "Lauch",
      "element": "fire",
      "hp": 16,
      "image": "/cards/pyre.png",
      "transcend": "runes>=10",
      "transcendEffect": {
        "type": "double_damage"
      }
    },
    {
      "id": "D2",
      "name": "Zephyr",
      "element": "water",
      "hp": 18,
      "image": "/cards/tide.png",
      "transcend": "damageInTurn>=6",
      "transcendEffect": {
        "type": "double_discard"
      }
    },
    {
      "id": "D3",
      "name": "Vena",
      "element": "grass",
      "hp": 20,
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
      "name": "Hollow",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F1.png",
      "abilities": [
       
        {
          "type": "damage",
          "value": 1
        },
        {
          "type": "discard",
          "value": 1
        }
      ]
    },
    {
      "id": "F2",
      "name": "Caustic Pot",
      "element": "fire",
      "attack": 0,
      "image": "/cards/F2.png",
      "abilities": [
 {
          "type": "draw",
          "value": 2
        },

]
    },
    {
      "id": "F3",
      "name": "Pandough",
      "element": "fire",
      "attack": 1,
      "image": "/cards/F3.png",
      "abilities": []
    },
    {
      "id": "F4",
      "name": "Divine Chilli",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F4.png",
      "abilities": []
    },
    {
      "id": "F5",
      "name": "Rival",
      "element": "fire",
      "attack": 1,
      "image": "/cards/F5.png",
      "abilities": []
    },
    {
      "id": "F6",
      "name": "lug",
      "element": "fire",
      "attack": 1,
      "image": "/cards/F6.png",
      "abilities": []
    },
    {
      "id": "F7",
      "name": "Eno",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F7.png",
      "abilities": [ ]
    },
    {
      "id": "F8",
      "name": "G.R.I.M",
      "element": "fire",
      "attack": 3,
      "image": "/cards/F8.png",
      "abilities": [{
          "type": "discard",
          "value": 1
        }]
    },
    {
      "id": "F9",
      "name": "Dinno",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F9.png",
      "abilities": []
    },
    {
      "id": "F10",
      "name": "Mudoink",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F10.png",
      "abilities": []
    },
    {
      "id": "F11",
      "name": "Grumble",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F11.png",
      "abilities": []
    },
    {
      "id": "F12",
      "name": "Recon Drone",
      "element": "fire",
      "attack": 1,
      "image": "/cards/F12.png",
      "abilities": [
        {
          "type": "draw",
          "value": 1
        }
      ]
    },
    {
      "id": "F13",
      "name": "Scorch",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F13.png",
      "abilities": [{
          "type": "damage",
          "value": 3
        },]
    },
    {
      "id": "F14",
      "name": "Temple Knight",
      "element": "fire",
      "attack": 4,
      "image": "/cards/F14.png",
      "abilities": [
        {
          "type": "damage",
          "value": 1
        }
      ]
    },
    {
      "id": "F15",
      "name": "Blazbee",
      "element": "fire",
      "attack": 1,
      "image": "/cards/F15.png",
      "abilities": [ {
          "type": "damage",
          "value": 1
        }]
    },
    {
      "id": "F16",
      "name": "Primordial Egg",
      "element": "fire",
      "attack": 1,
      "image": "/cards/F16.png",
      "abilities": []
    },
    {
      "id": "F17",
      "name": "Draco",
      "element": "fire",
      "attack": 2,
      "image": "/cards/F17.png",
      "abilities": []
    },
    {
      "id": "F18",
      "name": "Toaster Bot",
      "element": "fire",
      "attack": 1,
      "image": "/cards/F18.png",
      "abilities": [
        {
          "type": "discard",
          "value": 2
        }
      ]
    },
    {
      "id": "G1",
      "name": "Rayla Twins",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G1.png",
      "abilities": []
    },
    {
      "id": "G2",
      "name": "fernram",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G2.png",
      "abilities": [  {
          "type": "draw",
          "value": 2
        }]
    },
    {
      "id": "G3",
      "name": "Voidstring",
      "element": "grass",
      "attack": 1,
      "image": "/cards/G3.png",
      "abilities": []
    },
    {
      "id": "G4",
      "name": "Egg Academy",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G4.png",
      "abilities": []
    },
    {
      "id": "G5",
      "name": "Spirit Doctor",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G5.png",
      "abilities": [
        {
          "type": "draw",
          "value": 1
        }
      ]
    },
    {
      "id": "G6",
      "name": "Xelo",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G6.png",
      "abilities": []
    },
    {
      "id": "G7",
      "name": "Shorin",
      "element": "grass",
      "attack": 3,
      "image": "/cards/G7.png",
      "abilities": []
    },
    {
      "id": "G8",
      "name": "Wild Vyne",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G8.png",
      "abilities": []
    },
    {
      "id": "G9",
      "name": "Druidica",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G9.png",
      "abilities": [
        {
          "type": "damage",
          "value": 1
        }
      ]
    },
    {
      "id": "G10",
      "name": "ChalaWulu",
      "element": "grass",
      "attack": 1,
      "image": "/cards/G10.png",
      "abilities": []
    },
    {
      "id": "G11",
      "name": "Solari",
      "element": "grass",
      "attack": 1,
      "image": "/cards/G11.png",
      "abilities": []
    },
    {
      "id": "G12",
      "name": "Mage Knight",
      "element": "grass",
      "attack": 1,
      "image": "/cards/G12.png",
      "abilities": []
    },
    {
      "id": "G13",
      "name": "Frilla",
      "element": "grass",
      "attack": 3,
      "image": "/cards/G13.png",
      "abilities": []
    },
    {
      "id": "G14",
      "name": "Pix",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G14.png",
      "abilities": []
    },
    {
      "id": "G15",
      "name": "Wizcrow",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G15.png",
      "abilities": []
    },
    {
      "id": "G16",
      "name": "Monolith",
      "element": "grass",
      "attack": 5,
      "image": "/cards/G16.png",
      "abilities": [
      ]
    },
    {
      "id": "G17",
      "name": "Dr Alexi",
      "element": "grass",
      "attack": 1,
      "image": "/cards/G17.png",
      "abilities": [
        {
          "type": "discard",
          "value": 1
        }
      ]
    },
    {
      "id": "G18",
      "name": "Shible",
      "element": "grass",
      "attack": 2,
      "image": "/cards/G18.png",
      "abilities": []
    },
    {
      "id": "W1",
      "name": "Eyelock",
      "element": "water",
      "attack": 2,
      "image": "/cards/W1.png",
      "abilities": []
    },
    {
      "id": "W2",
      "name": "Shade",
      "element": "water",
      "attack": 1,
      "image": "/cards/W2.png",
      "abilities": []
    },
    {
      "id": "W3",
      "name": "Smallboss",
      "element": "water",
      "attack": 2,
      "image": "/cards/W3.png",
      "abilities": []
    },
    {
      "id": "W4",
      "name": "Praise Shroom",
      "element": "water",
      "attack": 2,
      "image": "/cards/W4.png",
      "abilities": [
        {
          "type": "damage",
          "value": 1
        }
      ]
    },
    {
      "id": "W5",
      "name": "Forager",
      "element": "water",
      "attack": 2,
      "image": "/cards/W5.png",
      "abilities": []
    },
    {
      "id": "W6",
      "name": "Spark",
      "element": "water",
      "attack": 1,
      "image": "/cards/W6.png",
      "abilities": []
    },
    {
      "id": "W7",
      "name": "Lanturn",
      "element": "water",
      "attack": 1,
      "image": "/cards/W7.png",
      "abilities": []
    },
    {
      "id": "W8",
      "name": "Birch",
      "element": "water",
      "attack": 3,
      "image": "/cards/W8.png",
      "abilities": []
    },
    {
      "id": "W9",
      "name": "Drill Operator",
      "element": "water",
      "attack": 2,
      "image": "/cards/W9.png",
      "abilities": [
        {
          "type": "draw",
          "value": 1
        }
      ]
    },
    {
      "id": "W10",
      "name": "Selen",
      "element": "water",
      "attack": 3,
      "image": "/cards/W10.png",
      "abilities": []
    },
    {
      "id": "W11",
      "name": "Toymaker",
      "element": "water",
      "attack": 2,
      "image": "/cards/W11.png",
      "abilities": []
    },
    {
      "id": "W12",
      "name": "Zilux",
      "element": "water",
      "attack": 2,
      "image": "/cards/W12.png",
      "abilities": []
    },
    {
      "id": "W13",
      "name": "Dark Mage",
      "element": "water",
      "attack": 2,
      "image": "/cards/W13.png",
      "abilities": []
    },
    {
      "id": "W14",
      "name": "Falco",
      "element": "water",
      "attack": 3,
      "image": "/cards/W14.png",
      "abilities": []
    },
    {
      "id": "W15",
      "name": "Kibble",
      "element": "water",
      "attack": 2,
      "image": "/cards/W15.png",
      "abilities": []
    },
    {
      "id": "W16",
      "name": "Justice Knight",
      "element": "water",
      "attack": 2,
      "image": "/cards/W16.png",
      "abilities": [
        {
          "type": "discard",
          "value": 1
        }
      ]
    },
    {
      "id": "W17",
      "name": "Umega",
      "element": "water",
      "attack": 2,
      "image": "/cards/W17.png",
      "abilities": [
        {
          "type": "damage",
          "value": 1
        }
      ]
    },
    {
      "id": "W18",
      "name": "Vortex",
      "element": "grass",
      "attack": 4,
      "image": "/cards/W18.png",
      "abilities": []
    }
  ]
}
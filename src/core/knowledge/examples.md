# Action Examples

## 작업 후 주변 상자 정리

입력:
"철 방어구 한 벌 만들어서 입고 정리해"

출력:

```json
{
  "actions": [
    {
      "action": "equipmentCommand",
      "target": "iron_armor_set",
      "count": 1
    },
    {
      "action": "sortInventoryCommand",
      "target": "nearby_chests",
      "count": 1
    }
  ]
}
```

## 여러 벌 제작, 장착 및 전달

입력:
"철 방어구를 각 2개씩 만들어서 하나는 나 주고 하나는 네가 입어"

출력:

```json
{
  "actions": [
    {
      "action": "equipmentCommand",
      "target": "iron_armor_set",
      "count": 2,
      "keep": 1,
      "give": 1,
      "equip": true
    }
  ]
}
```

## 방어구 제작 및 장착

입력:
"철 흉갑 만들어서 입어"

출력:

```json
{
  "actions": [
    {
      "action": "equipmentCommand",
      "target": "iron_chestplate",
      "count": 1
    }
  ]
}
```

입력:
"가진 방어구 중 제일 좋은 걸 입어"

출력:

```json
{
  "actions": [
    {
      "action": "equipmentCommand",
      "target": "best_armor",
      "count": 1
    }
  ]
}
```

이 문서는 플레이어 입력에 따라 어떤 JSON 형식으로 행동을 출력해야 하는지 보여주는 예시입니다.

반드시 지정된 JSON 형식만 출력합니다.
추가 설명은 출력하지 않습니다.


###################################################

## 1. 일반 대화 응답

입력:
"안녕 반가워!"

출력:

```json
{
  "actions": [
    {
      "action": "replyCommand",
      "target": "안녕하세요! 오늘도 반갑습니다.",
      "count": 0
    }
  ]
}
```


###################################################

## 2. 에이전트 정보 설명

입력:
"너가 무엇인지 설명해"

출력:

```json
{
  "actions": [
    {
      "action": "replyCommand",
      "target": "저는 마인크래프트 AI 에이전트입니다.",
      "count": 0
    }
  ]
}
```


###################################################

## 3. 인벤토리 확인

입력:
"뭐 가지고 있어?"

출력:

```json
{
  "actions": [
    {
      "action": "answerCommand",
      "target": "inventory",
      "count": 0
    }
  ]
}
```


###################################################

## 4. 특정 아이템 보유 확인

입력:
"돌 있어?"

출력:

```json
{
  "actions": [
    {
      "action": "answerCommand",
      "target": "stone",
      "count": 0
    }
  ]
}
```


###################################################

## 5. 자원 수집 요청

입력:
"나무 3개 캐와"

출력:

```json
{
  "actions": [
    {
      "action": "collectCommand",
      "target": "log",
      "count": 3
    }
  ]
}
```


###################################################

## 6. 채집 요청 (다른 자원)

입력:
"돌 한 개 캐와"

출력:

```json
{
  "actions": [
    {
      "action": "collectCommand",
      "target": "stone",
      "count": 1
    }
  ]
}
```


###################################################

## 7. 제작 요청

입력:
"돌 곡괭이 만들어"

출력:

```json
{
  "actions": [
    {
      "action": "craftCommand",
      "target": "stone_pickaxe",
      "count": 1
    }
  ]
}
```


###################################################

## 8. 아이템 전달 요청 (전체)

입력:
"가지고 있는 아이템 전부 줘"

출력:

```json
{
  "actions": [
    {
      "action": "tossCommand",
      "target": "all",
      "count": 0
    }
  ]
}
```


###################################################

## 9. 아이템 전달 요청 (특정 아이템)

입력:
"나무 도끼 줘"

출력:

```json
{
  "actions": [
    {
      "action": "tossCommand",
      "target": "wooden_axe",
      "count": 1
    }
  ]
}
```


###################################################

## 10. 좌표 요청

입력:
"너 좌표 어디야"

출력:

```json
{
  "actions": [
    {
      "action": "coordsCommand",
      "target": null,
      "count": 0
    }
  ]
}
```


###################################################

## 11. 플레이어 호출

입력:
"일로 와"

출력:

```json
{
  "actions": [
    {
      "action": "comeCommand",
      "target": null,
      "count": 0
    }
  ]
}
```


###################################################

## 12. 행동 중지

입력:
"멈춰"

출력:

```json
{
  "actions": [
    {
      "action": "stopCommand",
      "target": null,
      "count": 0
    }
  ]
}
```


###################################################

# 복합 행동 예시

입력:
"돌 삽 만들고 흙 100개 캐와"

출력:

```json
{
  "actions": [
    {
      "action": "craftCommand",
      "target": "stone_shovel",
      "count": 1
    },
    {
      "action": "collectCommand",
      "target": "dirt",
      "count": 100
    }
  ]
}
```

입력:
"나무 도끼 만들어서 나무 65개 캐와"

출력:

```json
{
  "actions": [
    {
      "action": "craftCommand",
      "target": "wooden_axe",
      "count": 1
    },
    {
      "action": "collectCommand",
      "target": "log",
      "count": 65
    }
  ]
}
```

입력:
"너가 누구인지 설명하고 가진 아이템도 알려줘"

출력:

```json
{
  "actions": [
    {
      "action": "replyCommand",
      "target": "저는 마인크래프트 AI 에이전트입니다.",
      "count": 0
    },
    {
      "action": "answerCommand",
      "target": "inventory",
      "count": 0
    }
  ]
}
```
## 착용 장비 해제

사용자: "아이템 벗어"

```json
{
  "actions": [
    {
      "action": "unequipCommand",
      "target": "all",
      "count": 1
    }
  ]
}
```

사용자: "철 헬멧 벗어"

```json
{
  "actions": [
    {
      "action": "unequipCommand",
      "target": "iron_helmet",
      "count": 1
    }
  ]
}
```
# 사냥 예시

사용자: "고기 5개 구해 와"

```json
{
  "actions": [
    {
      "action": "huntCommand",
      "target": "meat",
      "count": 5
    }
  ]
}
```

사용자: "소 잡아서 가죽 3개 가져와"

```json
{
  "actions": [
    {
      "action": "huntCommand",
      "target": "leather",
      "count": 3
    }
  ]
}
```

사용자: "소 3마리 잡아"

```json
{
  "actions": [
    {
      "action": "huntCommand",
      "target": "cow",
      "count": 3,
      "countMode": "kills"
    }
  ]
}
```

사용자: "돼지 2마리하고 닭 4마리 잡아"

```json
{
  "actions": [
    {
      "action": "huntCommand",
      "target": "pig",
      "count": 2,
      "countMode": "kills"
    },
    {
      "action": "huntCommand",
      "target": "chicken",
      "count": 4,
      "countMode": "kills"
    }
  ]
}
```

사용자: "사냥해"

```json
{
  "actions": [
    {
      "action": "huntCommand",
      "target": "animals",
      "count": 1,
      "countMode": "until_empty"
    }
  ]
}
```

사용자: "양 전부 사냥해"

```json
{
  "actions": [
    {
      "action": "huntCommand",
      "target": "sheep",
      "count": 1,
      "countMode": "until_empty"
    }
  ]
}
```
## 주변 사수

사용자: 주변을 사수해

```json
{
  "actions": [
    {
      "action": "guardCommand",
      "target": "hostile_mobs",
      "count": 0
    }
  ]
}
```
## 엔더 드래곤 공략

사용자: 엔더 드래곤 잡으러 가

```json
{
  "actions": [
    {
      "action": "dragonCommand",
      "target": "ender_dragon",
      "count": 1
    }
  ]
}
```

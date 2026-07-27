{
 "actions":[
  {
   "action":"string",
   "target":"string",
   "count":"number",
   "countMode":"optional string: drops, kills, or until_empty",
   "keep":"optional number",
   "give":"optional number",
   "equip":"optional boolean"
  }
 ]
}

## 최종 목표 예시 (추가)

```json
{
  "actions": [
    {
      "action": "collectCommand",
      "target": "stone",
      "count": 64
    }
  ]
}
```

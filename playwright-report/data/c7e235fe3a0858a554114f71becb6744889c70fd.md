# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - link "Connect" [ref=e7] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e8] [cursor=pointer]: Connect
        - navigation [ref=e9]:
          - link "대시보드" [ref=e10] [cursor=pointer]:
            - /url: /dashboard
          - link "매칭 결과" [ref=e11] [cursor=pointer]:
            - /url: /dashboard/matches
          - link "파트너 검색" [ref=e12] [cursor=pointer]:
            - /url: /dashboard/partners
        - button "김 김병진" [ref=e14] [cursor=pointer]:
          - generic [ref=e16] [cursor=pointer]: 김
          - generic [ref=e17] [cursor=pointer]: 김병진
    - main [ref=e18]:
      - generic [ref=e19]:
        - heading "매칭 결과" [level=1] [ref=e20]
        - paragraph [ref=e21]: 귀하의 조직 프로필과 적합한 지원 프로그램을 찾았습니다.
      - paragraph [ref=e23]: 매칭 결과를 불러오는데 실패했습니다.
    - region "Notifications (F8)":
      - list
  - button "피드백 보내기" [ref=e24] [cursor=pointer]:
    - img [ref=e25] [cursor=pointer]
    - generic [ref=e27] [cursor=pointer]: 피드백
  - alert [ref=e28]
```
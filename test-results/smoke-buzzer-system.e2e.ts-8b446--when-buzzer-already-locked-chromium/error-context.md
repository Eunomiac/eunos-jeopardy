# Page snapshot

```yaml
- application "Jeopardy game creation interface with drag and drop file upload" [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Currently logged in as
      - generic [ref=e7]: player1@e2e.com
      - button "Logout" [ref=e8] [cursor=pointer]
  - banner [ref=e9]:
    - generic [ref=e10]: Eunomiac's
    - heading "Jeopardy!" [level=1] [ref=e11]
  - main [ref=e12]:
    - generic [ref=e16]:
      - heading "Join Game" [level=2] [ref=e17]
      - paragraph [ref=e18]: Waiting for a host to create a game...
      - generic [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]: Nickname
          - textbox "Nickname" [active] [ref=e22]:
            - /placeholder: Your display name for this game...
            - text: Alice
          - text: This will be your display name in the game
        - button "Waiting for Game" [disabled] [ref=e23]
      - generic [ref=e24]:
        - heading "How It Works" [level=3] [ref=e25]
        - list [ref=e26]:
          - listitem [ref=e27]: Wait for a host to create a game
          - listitem [ref=e28]: When a game is available, click "Join Game"
          - listitem [ref=e29]: You can set a nickname for each game
  - contentinfo [ref=e30]:
    - paragraph [ref=e31]: © 2025 Euno's Jeopardy. Built with React + TypeScript + Vite.
  - generic [ref=e32]:
    - generic [ref=e33]: ⚪ Supabase
    - generic [ref=e34]: "Status: SUBSCRIBED"
    - generic [ref=e35]: "User: fab88c6a..."
    - generic [ref=e36]: "Game: None"
    - generic [ref=e37]: "Updated: 3:11:34 PM"
```
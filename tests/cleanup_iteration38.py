import os

import requests
from dotenv import load_dotenv


load_dotenv('/app/frontend/.env')

BASE_URL = (os.environ.get('EXPO_BACKEND_URL') or '').strip().strip("'").rstrip('/')


def main() -> None:
    if not BASE_URL:
        print('Missing EXPO_BACKEND_URL; cleanup skipped')
        return

    s = requests.Session()
    login = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "qa_tester_b40dc299@linguatest.com", "password": "QATest2026!"},
        timeout=30,
    )
    if login.status_code != 200:
        print(f'Cleanup login failed: {login.status_code} {login.text[:180]}')
        return

    token = login.json().get('token')
    me = login.json().get('user', {})
    headers = {"Authorization": f"Bearer {token}"}

    rooms_res = s.get(f"{BASE_URL}/api/rooms", headers=headers, timeout=30)
    if rooms_res.status_code != 200:
        print(f'List rooms failed: {rooms_res.status_code}')
        return

    ended = 0
    for room in rooms_res.json() or []:
        if room.get('is_live') and (room.get('host') or {}).get('id') == me.get('id'):
            rid = room.get('id')
            if not rid:
                continue
            s.post(f"{BASE_URL}/api/rooms/{rid}/end", headers=headers, timeout=20)
            ended += 1
    print(f'Cleanup complete. Ended rooms: {ended}')


if __name__ == '__main__':
    main()

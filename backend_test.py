#!/usr/bin/env python3
"""
Backend test for Group Chat + 1:1 Regression
Tests group chat creation, messaging, member management, and 1:1 chat regression.
"""

import requests
import sys
import base64

# Backend URL from frontend/.env
BASE_URL = "https://expo-fix-12.preview.emergentagent.com/api"

# Test credentials
MEI_EMAIL = "mei@demo.com"
MEI_PASSWORD = "Demo1234!"
DIEGO_EMAIL = "diego@demo.com"
DIEGO_PASSWORD = "Demo1234!"

def login(email, password):
    """Login and return JWT token and user_id"""
    print(f"🔐 Logging in as {email}...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code} {response.text}")
        sys.exit(1)
    
    data = response.json()
    token = data.get("token")
    user_id = data.get("user", {}).get("id")
    
    if not token or not user_id:
        print(f"❌ Missing token or user_id in login response: {data}")
        sys.exit(1)
    
    print(f"✅ Login successful, user_id: {user_id}")
    return token, user_id

def test_group_chat():
    """Test group chat functionality"""
    print("\n" + "="*80)
    print("TESTING: GROUP CHAT FUNCTIONALITY")
    print("="*80 + "\n")
    
    # Login both users
    mei_token, mei_id = login(MEI_EMAIL, MEI_PASSWORD)
    diego_token, diego_id = login(DIEGO_EMAIL, DIEGO_PASSWORD)
    
    mei_headers = {"Authorization": f"Bearer {mei_token}"}
    diego_headers = {"Authorization": f"Bearer {diego_token}"}
    
    # A) GROUP CHAT TESTS
    
    # TEST 1: mei creates group with diego
    print("\n🧪 TEST 1: POST /api/chats/group with member_ids:[diego_id]")
    response = requests.post(
        f"{BASE_URL}/chats/group",
        headers=mei_headers,
        json={"member_ids": [diego_id]}
    )
    
    if response.status_code not in [200, 201]:
        print(f"❌ FAILED: Group creation failed: {response.status_code} {response.text}")
        return False
    
    group_data = response.json()
    group_id = group_data.get("id")
    
    # Verify response structure
    if not group_data.get("is_group"):
        print(f"❌ FAILED: is_group should be true")
        return False
    
    if not group_data.get("name"):
        print(f"❌ FAILED: name field missing")
        return False
    
    if group_data.get("member_count") != 2:
        print(f"❌ FAILED: member_count should be 2, got {group_data.get('member_count')}")
        return False
    
    if not group_data.get("members_preview"):
        print(f"❌ FAILED: members_preview missing")
        return False
    
    if group_data.get("owner_id") != mei_id:
        print(f"❌ FAILED: owner_id should be mei_id")
        return False
    
    print(f"✅ PASSED: Group created successfully")
    print(f"   Group ID: {group_id}")
    print(f"   Name: {group_data.get('name')}")
    print(f"   Member count: {group_data.get('member_count')}")
    print(f"   Owner: {group_data.get('owner_id')}")
    
    # TEST 2: diego gets chats and sees the group with system message
    print("\n🧪 TEST 2: GET /api/chats as diego → group appears with system message")
    response = requests.get(f"{BASE_URL}/chats", headers=diego_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET /api/chats failed: {response.status_code} {response.text}")
        return False
    
    chats = response.json()
    group_chat = None
    
    for chat in chats:
        if chat.get("id") == group_id:
            group_chat = chat
            break
    
    if not group_chat:
        print(f"❌ FAILED: Group not found in diego's chats")
        return False
    
    if not group_chat.get("is_group"):
        print(f"❌ FAILED: is_group should be true in chat list")
        return False
    
    print(f"✅ PASSED: Group appears in diego's chat list")
    
    # Check for system message
    response = requests.get(f"{BASE_URL}/chats/{group_id}/messages", headers=diego_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET messages failed: {response.status_code} {response.text}")
        return False
    
    messages = response.json()
    
    if not messages:
        print(f"❌ FAILED: No messages found (expected system message)")
        return False
    
    first_msg = messages[0]
    
    if first_msg.get("type") != "system":
        print(f"❌ FAILED: First message should be type=system, got {first_msg.get('type')}")
        return False
    
    if "invited" not in first_msg.get("text", "").lower():
        print(f"❌ FAILED: System message should mention 'invited'")
        return False
    
    print(f"✅ PASSED: System message present: '{first_msg.get('text')}'")
    
    # TEST 3: mei sends message to group
    print("\n🧪 TEST 3: POST /api/chats/{gid}/messages with text='hi group'")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/messages",
        headers=mei_headers,
        json={"text": "hi group"}
    )
    
    if response.status_code != 201:
        print(f"❌ FAILED: Send message failed: {response.status_code} {response.text}")
        return False
    
    msg_data = response.json()
    msg_id = msg_data.get("id")
    
    print(f"✅ PASSED: Message sent successfully, id: {msg_id}")
    
    # Verify diego can see the message with sender card
    response = requests.get(f"{BASE_URL}/chats/{group_id}/messages", headers=diego_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET messages failed: {response.status_code} {response.text}")
        return False
    
    messages = response.json()
    
    # Find mei's message (not system message)
    mei_msg = None
    for msg in messages:
        if msg.get("text") == "hi group":
            mei_msg = msg
            break
    
    if not mei_msg:
        print(f"❌ FAILED: Message 'hi group' not found")
        return False
    
    if not mei_msg.get("sender"):
        print(f"❌ FAILED: sender card missing from group message")
        return False
    
    if mei_msg["sender"].get("id") != mei_id:
        print(f"❌ FAILED: sender.id should be mei_id")
        return False
    
    if not mei_msg["sender"].get("name"):
        print(f"❌ FAILED: sender.name missing")
        return False
    
    print(f"✅ PASSED: Message visible with sender card (sender.name: {mei_msg['sender'].get('name')})")
    
    # TEST 4: diego's unread count incremented
    print("\n🧪 TEST 4: GET /api/chats as diego → unread>=1 for group")
    response = requests.get(f"{BASE_URL}/chats", headers=diego_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET /api/chats failed: {response.status_code} {response.text}")
        return False
    
    chats = response.json()
    group_chat = None
    
    for chat in chats:
        if chat.get("id") == group_id:
            group_chat = chat
            break
    
    if not group_chat:
        print(f"❌ FAILED: Group not found in chats")
        return False
    
    unread = group_chat.get("unread", 0)
    
    if unread < 1:
        print(f"❌ FAILED: unread should be >= 1, got {unread}")
        return False
    
    print(f"✅ PASSED: Unread count = {unread}")
    
    # TEST 5: Rename group
    print("\n🧪 TEST 5: POST /api/chats/{gid}/group/name with name='Renamed'")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/group/name",
        headers=mei_headers,
        json={"name": "Renamed"}
    )
    
    if response.status_code != 200:
        print(f"❌ FAILED: Rename failed: {response.status_code} {response.text}")
        return False
    
    rename_data = response.json()
    
    if not rename_data.get("ok"):
        print(f"❌ FAILED: ok should be true")
        return False
    
    if rename_data.get("name") != "Renamed":
        print(f"❌ FAILED: name should be 'Renamed', got {rename_data.get('name')}")
        return False
    
    print(f"✅ PASSED: Group renamed to 'Renamed'")
    
    # Verify name persisted
    response = requests.get(f"{BASE_URL}/chats/{group_id}", headers=diego_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET group failed: {response.status_code} {response.text}")
        return False
    
    group_data = response.json()
    
    if group_data.get("name") != "Renamed":
        print(f"❌ FAILED: name not persisted, got {group_data.get('name')}")
        return False
    
    print(f"✅ PASSED: Name persisted in GET /api/chats/{group_id}")
    
    # Check for system message about rename
    response = requests.get(f"{BASE_URL}/chats/{group_id}/messages", headers=diego_headers)
    messages = response.json()
    
    rename_msg = None
    for msg in messages:
        if msg.get("type") == "system" and "renamed" in msg.get("text", "").lower():
            rename_msg = msg
            break
    
    if not rename_msg:
        print(f"⚠️  WARNING: No system message about rename found")
    else:
        print(f"✅ PASSED: System message about rename: '{rename_msg.get('text')}'")
    
    # TEST 6: Get group members
    print("\n🧪 TEST 6: GET /api/chats/{gid}/group/members")
    response = requests.get(f"{BASE_URL}/chats/{group_id}/group/members", headers=mei_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET members failed: {response.status_code} {response.text}")
        return False
    
    members_data = response.json()
    
    if members_data.get("owner_id") != mei_id:
        print(f"❌ FAILED: owner_id should be mei_id")
        return False
    
    members = members_data.get("members", [])
    
    if len(members) != 2:
        print(f"❌ FAILED: Should have 2 members, got {len(members)}")
        return False
    
    print(f"✅ PASSED: Members list has 2 members, owner_id: {members_data.get('owner_id')}")
    
    # TEST 7: diego tries to remove mei (should fail 403)
    print("\n🧪 TEST 7: diego POST /api/chats/{gid}/group/remove {user_id: mei_id} → 403")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/group/remove",
        headers=diego_headers,
        json={"user_id": mei_id}
    )
    
    if response.status_code != 403:
        print(f"❌ FAILED: Should return 403, got {response.status_code}")
        return False
    
    print(f"✅ PASSED: Non-owner correctly rejected with 403")
    
    # mei removes diego
    print("\n   mei POST /api/chats/{gid}/group/remove {user_id: diego_id} → ok")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/group/remove",
        headers=mei_headers,
        json={"user_id": diego_id}
    )
    
    if response.status_code != 200:
        print(f"❌ FAILED: Remove failed: {response.status_code} {response.text}")
        return False
    
    remove_data = response.json()
    
    if not remove_data.get("ok"):
        print(f"❌ FAILED: ok should be true")
        return False
    
    print(f"✅ PASSED: diego removed successfully")
    
    # Verify member count is now 1
    response = requests.get(f"{BASE_URL}/chats/{group_id}", headers=mei_headers)
    group_data = response.json()
    
    if group_data.get("member_count") != 1:
        print(f"❌ FAILED: member_count should be 1, got {group_data.get('member_count')}")
        return False
    
    print(f"✅ PASSED: member_count now 1")
    
    # Re-add diego
    print("\n   mei POST /api/chats/{gid}/group/add {member_ids:[diego_id]} → ok")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/group/add",
        headers=mei_headers,
        json={"member_ids": [diego_id]}
    )
    
    if response.status_code != 200:
        print(f"❌ FAILED: Add failed: {response.status_code} {response.text}")
        return False
    
    add_data = response.json()
    
    if not add_data.get("ok"):
        print(f"❌ FAILED: ok should be true")
        return False
    
    print(f"✅ PASSED: diego re-added successfully")
    
    # Verify member count is back to 2
    response = requests.get(f"{BASE_URL}/chats/{group_id}", headers=mei_headers)
    group_data = response.json()
    
    if group_data.get("member_count") != 2:
        print(f"❌ FAILED: member_count should be 2, got {group_data.get('member_count')}")
        return False
    
    print(f"✅ PASSED: member_count back to 2")
    
    # TEST 8: diego leaves group
    print("\n🧪 TEST 8: diego POST /api/chats/{gid}/group/leave → ok")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/group/leave",
        headers=diego_headers
    )
    
    if response.status_code != 200:
        print(f"❌ FAILED: Leave failed: {response.status_code} {response.text}")
        return False
    
    leave_data = response.json()
    
    if not leave_data.get("ok"):
        print(f"❌ FAILED: ok should be true")
        return False
    
    print(f"✅ PASSED: diego left group successfully")
    
    # Verify group no longer in diego's chats
    response = requests.get(f"{BASE_URL}/chats", headers=diego_headers)
    chats = response.json()
    
    group_found = False
    for chat in chats:
        if chat.get("id") == group_id:
            group_found = True
            break
    
    if group_found:
        print(f"❌ FAILED: Group should not be in diego's chats after leaving")
        return False
    
    print(f"✅ PASSED: Group no longer in diego's chat list")
    
    # Re-add diego for remaining tests
    print("\n   Re-adding diego for remaining tests...")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/group/add",
        headers=mei_headers,
        json={"member_ids": [diego_id]}
    )
    
    if response.status_code != 200:
        print(f"⚠️  WARNING: Could not re-add diego: {response.status_code}")
    else:
        print(f"✅ diego re-added")
    
    # TEST 9: Voice message in group
    print("\n🧪 TEST 9: mei POST /api/chats/{gid}/voice with audio_base64")
    
    # Create minimal valid WAV audio (44 bytes header + 60 bytes data)
    wav_header = b'RIFF' + (100).to_bytes(4, 'little') + b'WAVE'
    wav_header += b'fmt ' + (16).to_bytes(4, 'little')
    wav_header += (1).to_bytes(2, 'little')  # PCM
    wav_header += (1).to_bytes(2, 'little')  # Mono
    wav_header += (8000).to_bytes(4, 'little')  # Sample rate
    wav_header += (16000).to_bytes(4, 'little')  # Byte rate
    wav_header += (2).to_bytes(2, 'little')  # Block align
    wav_header += (16).to_bytes(2, 'little')  # Bits per sample
    wav_header += b'data' + (60).to_bytes(4, 'little')
    wav_data = b'\x00' * 60
    wav_bytes = wav_header + wav_data
    
    audio_base64 = base64.b64encode(wav_bytes).decode('utf-8')
    
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/voice",
        headers=mei_headers,
        json={
            "audio_base64": audio_base64,
            "mime": "audio/wav",
            "duration_ms": 1500
        }
    )
    
    if response.status_code != 201:
        print(f"❌ FAILED: Voice message failed: {response.status_code} {response.text}")
        return False
    
    voice_data = response.json()
    
    if voice_data.get("type") != "voice":
        print(f"❌ FAILED: type should be 'voice', got {voice_data.get('type')}")
        return False
    
    if not voice_data.get("audio_id"):
        print(f"❌ FAILED: audio_id missing")
        return False
    
    print(f"✅ PASSED: Voice message sent successfully")
    
    # TEST 10: Sticker in group
    print("\n🧪 TEST 10: POST /api/chats/{gid}/sticker with sticker='1f600'")
    response = requests.post(
        f"{BASE_URL}/chats/{group_id}/sticker",
        headers=mei_headers,
        json={"sticker": "1f600"}
    )
    
    if response.status_code != 201:
        print(f"❌ FAILED: Sticker failed: {response.status_code} {response.text}")
        return False
    
    sticker_data = response.json()
    
    if sticker_data.get("type") != "sticker":
        print(f"❌ FAILED: type should be 'sticker', got {sticker_data.get('type')}")
        return False
    
    if sticker_data.get("sticker") != "1f600":
        print(f"❌ FAILED: sticker should be '1f600', got {sticker_data.get('sticker')}")
        return False
    
    print(f"✅ PASSED: Sticker sent successfully")
    
    return True

def test_1_to_1_regression():
    """Test 1:1 chat regression"""
    print("\n" + "="*80)
    print("TESTING: 1:1 CHAT REGRESSION")
    print("="*80 + "\n")
    
    # Login both users
    mei_token, mei_id = login(MEI_EMAIL, MEI_PASSWORD)
    diego_token, diego_id = login(DIEGO_EMAIL, DIEGO_PASSWORD)
    
    mei_headers = {"Authorization": f"Bearer {mei_token}"}
    diego_headers = {"Authorization": f"Bearer {diego_token}"}
    
    # TEST 11: Create/get 1:1 conversation
    print("\n🧪 TEST 11: mei POST /api/chats {partner_id: diego_id} → 1:1 conversation")
    response = requests.post(
        f"{BASE_URL}/chats",
        headers=mei_headers,
        json={"partner_id": diego_id}
    )
    
    if response.status_code not in [200, 201]:
        print(f"❌ FAILED: Create conversation failed: {response.status_code} {response.text}")
        return False
    
    conv_data = response.json()
    conv_id = conv_data.get("id")
    
    # Verify it's NOT a group
    if conv_data.get("is_group"):
        print(f"❌ FAILED: is_group should be false or absent for 1:1")
        return False
    
    # Verify partner card present
    if not conv_data.get("partner"):
        print(f"❌ FAILED: partner card missing")
        return False
    
    if conv_data["partner"].get("id") != diego_id:
        print(f"❌ FAILED: partner.id should be diego_id")
        return False
    
    print(f"✅ PASSED: 1:1 conversation created/retrieved")
    print(f"   Conversation ID: {conv_id}")
    print(f"   Partner: {conv_data['partner'].get('name')}")
    
    # TEST 12: Send text message
    print("\n🧪 TEST 12: mei sends text message → diego sees unread increment")
    response = requests.post(
        f"{BASE_URL}/chats/{conv_id}/messages",
        headers=mei_headers,
        json={"text": "test message for 1:1"}
    )
    
    if response.status_code != 201:
        print(f"❌ FAILED: Send message failed: {response.status_code} {response.text}")
        return False
    
    msg_data = response.json()
    msg_id = msg_data.get("id")
    
    print(f"✅ PASSED: Text message sent, id: {msg_id}")
    
    # Verify diego sees unread increment
    response = requests.get(f"{BASE_URL}/chats", headers=diego_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET chats failed: {response.status_code} {response.text}")
        return False
    
    chats = response.json()
    conv = None
    
    for chat in chats:
        if chat.get("id") == conv_id:
            conv = chat
            break
    
    if not conv:
        print(f"❌ FAILED: Conversation not found in diego's chats")
        return False
    
    unread = conv.get("unread", 0)
    
    if unread < 1:
        print(f"❌ FAILED: unread should be >= 1, got {unread}")
        return False
    
    print(f"✅ PASSED: diego sees unread = {unread}")
    
    # Verify messages OK
    response = requests.get(f"{BASE_URL}/chats/{conv_id}/messages", headers=diego_headers)
    
    if response.status_code != 200:
        print(f"❌ FAILED: GET messages failed: {response.status_code} {response.text}")
        return False
    
    messages = response.json()
    
    found = False
    for msg in messages:
        if msg.get("id") == msg_id:
            found = True
            break
    
    if not found:
        print(f"❌ FAILED: Message not found in messages list")
        return False
    
    print(f"✅ PASSED: Message visible in GET messages")
    
    # TEST 13: Send voice + image
    print("\n🧪 TEST 13: mei sends voice + image messages")
    
    # Voice message
    wav_header = b'RIFF' + (100).to_bytes(4, 'little') + b'WAVE'
    wav_header += b'fmt ' + (16).to_bytes(4, 'little')
    wav_header += (1).to_bytes(2, 'little')
    wav_header += (1).to_bytes(2, 'little')
    wav_header += (8000).to_bytes(4, 'little')
    wav_header += (16000).to_bytes(4, 'little')
    wav_header += (2).to_bytes(2, 'little')
    wav_header += (16).to_bytes(2, 'little')
    wav_header += b'data' + (60).to_bytes(4, 'little')
    wav_data = b'\x00' * 60
    wav_bytes = wav_header + wav_data
    audio_base64 = base64.b64encode(wav_bytes).decode('utf-8')
    
    response = requests.post(
        f"{BASE_URL}/chats/{conv_id}/voice",
        headers=mei_headers,
        json={
            "audio_base64": audio_base64,
            "mime": "audio/wav",
            "duration_ms": 1000
        }
    )
    
    if response.status_code != 201:
        print(f"❌ FAILED: Voice message failed: {response.status_code} {response.text}")
        return False
    
    print(f"✅ PASSED: Voice message sent")
    
    # Image message (tiny PNG)
    png_bytes = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
    image_base64 = base64.b64encode(png_bytes).decode('utf-8')
    
    response = requests.post(
        f"{BASE_URL}/chats/{conv_id}/image",
        headers=mei_headers,
        json={
            "image_base64": image_base64,
            "mime": "image/png"
        }
    )
    
    if response.status_code != 201:
        print(f"❌ FAILED: Image message failed: {response.status_code} {response.text}")
        return False
    
    print(f"✅ PASSED: Image message sent")
    
    # TEST 14: Reaction
    print("\n🧪 TEST 14: diego POST /api/chats/{cid}/messages/{mid}/react {emoji:'❤️'}")
    response = requests.post(
        f"{BASE_URL}/chats/{conv_id}/messages/{msg_id}/react",
        headers=diego_headers,
        json={"emoji": "❤️"}
    )
    
    if response.status_code != 200:
        print(f"❌ FAILED: React failed: {response.status_code} {response.text}")
        return False
    
    react_data = response.json()
    
    # Verify reactions array present
    if "reactions" not in react_data:
        print(f"❌ FAILED: reactions array missing")
        return False
    
    print(f"✅ PASSED: Reaction added successfully")
    
    # TEST 15: Call log
    print("\n🧪 TEST 15: mei POST /api/chats/{cid}/call {status:'answered', duration_ms:5000, kind:'voice'}")
    response = requests.post(
        f"{BASE_URL}/chats/{conv_id}/call",
        headers=mei_headers,
        json={
            "status": "answered",
            "duration_ms": 5000,
            "kind": "voice"
        }
    )
    
    if response.status_code != 201:
        print(f"❌ FAILED: Call log failed: {response.status_code} {response.text}")
        return False
    
    call_data = response.json()
    
    if call_data.get("type") != "call":
        print(f"❌ FAILED: type should be 'call', got {call_data.get('type')}")
        return False
    
    if call_data.get("call_status") != "answered":
        print(f"❌ FAILED: call_status should be 'answered', got {call_data.get('call_status')}")
        return False
    
    print(f"✅ PASSED: Call log created successfully")
    
    return True

if __name__ == "__main__":
    try:
        print("\n" + "="*80)
        print("GROUP CHAT + 1:1 REGRESSION TEST SUITE")
        print("="*80)
        
        group_success = test_group_chat()
        regression_success = test_1_to_1_regression()
        
        if group_success and regression_success:
            print("\n" + "="*80)
            print("✅ ALL TESTS PASSED")
            print("="*80)
            sys.exit(0)
        else:
            print("\n" + "="*80)
            print("❌ SOME TESTS FAILED")
            print("="*80)
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

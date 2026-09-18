#!/usr/bin/env python3
"""
Backend API testing for QA setup and auth regression.
Tests QA user authentication, conversation setup, and profile completeness.
"""

import requests
import json
from datetime import datetime

# Load configuration from environment
BASE_URL = "https://elevate-familiar.preview.emergentagent.com/api"

# Test credentials from memory/test_credentials.md
QA1_EMAIL = "qa_tester_b40dc299@linguatest.com"
QA1_PASSWORD = "QATest2026!"
QA1_USER_ID = "83cdf218-fc71-4d7b-9427-1e7f6adfd9dc"

QA2_EMAIL = "qa_guest_removal_67403793@linguatest.com"
QA2_PASSWORD = "QATest2026!"
QA2_USER_ID = "4d54db47-1a80-47b1-bcf7-ea76d748c671"

def print_test(name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")

def test_backend_health():
    """Test 1: Backend health check"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        passed = response.status_code == 200
        print_test("Backend health check", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Backend health check", False, f"Error: {str(e)}")
        return False

def test_qa1_login():
    """Test 2: QA User 1 login"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": QA1_EMAIL, "password": QA1_PASSWORD},
            timeout=10
        )
        passed = response.status_code == 200
        if passed:
            data = response.json()
            token = data.get("token")
            user_id = data.get("user", {}).get("id")
            print_test("QA User 1 login", passed, f"User ID: {user_id}")
            return token, user_id
        else:
            print_test("QA User 1 login", False, f"Status: {response.status_code}, Response: {response.text}")
            return None, None
    except Exception as e:
        print_test("QA User 1 login", False, f"Error: {str(e)}")
        return None, None

def test_qa1_me(token):
    """Test 3: QA User 1 /auth/me"""
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        passed = response.status_code == 200
        if passed:
            data = response.json()
            user_id = data.get("id")
            print_test("QA User 1 /auth/me", passed, f"User ID: {user_id}")
            return data
        else:
            print_test("QA User 1 /auth/me", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        print_test("QA User 1 /auth/me", False, f"Error: {str(e)}")
        return None

def test_qa2_login():
    """Test 4: QA User 2 login"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": QA2_EMAIL, "password": QA2_PASSWORD},
            timeout=10
        )
        passed = response.status_code == 200
        if passed:
            data = response.json()
            token = data.get("token")
            user_id = data.get("user", {}).get("id")
            print_test("QA User 2 login", passed, f"User ID: {user_id}")
            return token, user_id
        else:
            print_test("QA User 2 login", False, f"Status: {response.status_code}, Response: {response.text}")
            return None, None
    except Exception as e:
        print_test("QA User 2 login", False, f"Error: {str(e)}")
        return None, None

def test_qa2_me(token):
    """Test 5: QA User 2 /auth/me"""
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        passed = response.status_code == 200
        if passed:
            data = response.json()
            user_id = data.get("id")
            print_test("QA User 2 /auth/me", passed, f"User ID: {user_id}")
            return data
        else:
            print_test("QA User 2 /auth/me", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        print_test("QA User 2 /auth/me", False, f"Error: {str(e)}")
        return None

def test_guest_post_404():
    """Test 6: Guest POST returns 404"""
    try:
        response = requests.post(f"{BASE_URL}/auth/guest", json={}, timeout=10)
        passed = response.status_code == 404
        print_test("Guest POST returns 404", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Guest POST returns 404", False, f"Error: {str(e)}")
        return False

def check_qa2_profile(qa2_user):
    """Check if QA2 profile needs completion"""
    native_language = qa2_user.get("native_language")
    learning_language = qa2_user.get("learning_language")
    
    needs_completion = not native_language or not learning_language
    
    if needs_completion:
        print(f"⚠️  QA2 profile incomplete:")
        print(f"  native_language: {native_language}")
        print(f"  learning_language: {learning_language}")
    else:
        print(f"✅ QA2 profile complete:")
        print(f"  native_language: {native_language}")
        print(f"  learning_language: {learning_language}")
    
    return needs_completion

def complete_qa2_profile(token, qa2_user):
    """Test 7: Complete QA2 profile if needed"""
    needs_completion = check_qa2_profile(qa2_user)
    
    if not needs_completion:
        print_test("QA2 profile completion", True, "Profile already complete, no update needed")
        return True
    
    # Complete profile with minimal required fields
    # Keep existing gender if set, use identifiable QA name
    profile_update = {
        "native_language": "en",
        "learning_language": "es"
    }
    
    # Preserve existing gender if set
    if qa2_user.get("gender"):
        print(f"  Preserving existing gender: {qa2_user.get('gender')}")
    
    try:
        response = requests.put(
            f"{BASE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json=profile_update,
            timeout=10
        )
        passed = response.status_code == 200
        if passed:
            data = response.json()
            print_test("QA2 profile completion", passed, 
                      f"Updated: native_language={data.get('native_language')}, learning_language={data.get('learning_language')}")
            print(f"  ⚠️  PROFILE UPDATED: QA2 now has native_language=en, learning_language=es")
            return True
        else:
            print_test("QA2 profile completion", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_test("QA2 profile completion", False, f"Error: {str(e)}")
        return False

def find_or_create_conversation(qa1_token, qa2_user_id):
    """Test 8: Find or create conversation between QA1 and QA2"""
    try:
        # First, try to find existing conversation
        response = requests.get(
            f"{BASE_URL}/chats",
            headers={"Authorization": f"Bearer {qa1_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            conversations = response.json()
            # Look for conversation with QA2
            for conv in conversations:
                participants = conv.get("participants", [])
                participant_ids = [p.get("id") for p in participants]
                if qa2_user_id in participant_ids:
                    conv_id = conv.get("id")
                    print_test("Find existing conversation", True, f"Found conversation ID: {conv_id}")
                    return conv_id
            
            # No existing conversation found, create one
            print("  No existing conversation found, creating new one...")
            create_response = requests.post(
                f"{BASE_URL}/chats",
                headers={"Authorization": f"Bearer {qa1_token}"},
                json={"partner_id": qa2_user_id},
                timeout=10
            )
            
            if create_response.status_code in [200, 201]:
                conv_data = create_response.json()
                conv_id = conv_data.get("id")
                print_test("Create conversation", True, f"Created conversation ID: {conv_id}")
                return conv_id
            else:
                print_test("Create conversation", False, 
                          f"Status: {create_response.status_code}, Response: {create_response.text}")
                return None
        else:
            print_test("Find existing conversation", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        print_test("Find/create conversation", False, f"Error: {str(e)}")
        return None

def test_wrong_password():
    """Test 9: Wrong password returns 401"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": QA1_EMAIL, "password": "WrongPassword123!"},
            timeout=10
        )
        passed = response.status_code == 401
        print_test("Wrong password returns 401", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Wrong password returns 401", False, f"Error: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("=" * 80)
    print("BACKEND QA SETUP AND AUTH REGRESSION TESTING")
    print("=" * 80)
    print()
    
    results = []
    
    # Test 1: Backend health
    print("1. Backend Health Check")
    print("-" * 80)
    results.append(test_backend_health())
    print()
    
    # Test 2-3: QA User 1 auth
    print("2. QA User 1 Authentication")
    print("-" * 80)
    qa1_token, qa1_user_id = test_qa1_login()
    if qa1_token:
        results.append(True)
        qa1_user = test_qa1_me(qa1_token)
        results.append(qa1_user is not None)
    else:
        results.append(False)
        results.append(False)
    print()
    
    # Test 4-5: QA User 2 auth
    print("3. QA User 2 Authentication")
    print("-" * 80)
    qa2_token, qa2_user_id = test_qa2_login()
    if qa2_token:
        results.append(True)
        qa2_user = test_qa2_me(qa2_token)
        results.append(qa2_user is not None)
    else:
        results.append(False)
        results.append(False)
    print()
    
    # Test 6: Guest POST 404
    print("4. Guest Mode Removal Verification")
    print("-" * 80)
    results.append(test_guest_post_404())
    print()
    
    # Test 7: QA2 profile completion
    if qa2_user:
        print("5. QA2 Profile Completion Check")
        print("-" * 80)
        results.append(complete_qa2_profile(qa2_token, qa2_user))
        print()
    
    # Test 8: Find or create conversation
    if qa1_token and qa2_user_id:
        print("6. QA Conversation Setup")
        print("-" * 80)
        conv_id = find_or_create_conversation(qa1_token, qa2_user_id)
        results.append(conv_id is not None)
        if conv_id:
            print(f"\n📝 CONVERSATION ID FOR FRONTEND TESTING: {conv_id}")
        print()
    
    # Test 9: Wrong password
    print("7. Wrong Password Validation")
    print("-" * 80)
    results.append(test_wrong_password())
    print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")
    print()
    
    if passed == total:
        print("✅ ALL TESTS PASSED - Backend ready for frontend UI testing")
    else:
        print("❌ SOME TESTS FAILED - Review failures above")
    
    return passed == total

if __name__ == "__main__":
    main()

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, date
import os
from functools import wraps
import re
import requests
import traceback
import jwt
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))

# CORS - allow React dev server
CORS(app, supports_credentials=True, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
    os.environ.get('FRONTEND_URL', 'http://localhost:5173')
])

DB_USERNAME = os.environ.get('DB_USERNAME', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'password')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '3306')
DB_NAME = os.environ.get('DB_NAME', 'AgriSafe')

# WhatsApp Configuration
WHATSAPP_API_URL = os.environ.get('WHATSAPP_API_URL', 'https://api.tryowbot.com/sender')
WHATSAPP_API_TOKEN = os.environ.get('WHATSAPP_API_TOKEN', '')
WHATSAPP_TIMEOUT = int(os.environ.get('WHATSAPP_TIMEOUT', '30'))
WHATSAPP_MAX_RETRIES = int(os.environ.get('WHATSAPP_MAX_RETRIES', '3'))
WHATSAPP_ENABLED = os.environ.get('WHATSAPP_ENABLED', 'true').lower() == 'true'

# Import database operations from db.py
import db as database
from db import (
    get_medical_shop_by_mobile, get_medical_shop_by_id, create_medical_shop,
    get_farmer_by_id, create_farmer, get_doctor_by_id, create_doctor,
    get_recommendation_by_id, get_recommendations_by_shop_id, claim_recommendation,
    get_recommendation_items_by_recommendation_id, create_recommendation_item,
    update_recommendation_item_dates, get_shop_statistics, search_unclaimed_recommendations,
    test_database_connection
)


# ==================== JWT AUTH ====================

def generate_token(shop_id, shop_name):
    payload = {
        'shop_id': shop_id,
        'shop_name': shop_name,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.shop_id = data['shop_id']
            request.shop_name = data['shop_name']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated_function


# ==================== WHATSAPP ====================

def send_whatsapp_message(farmer_mobile, farmer_name, recommendation_items, start_date, end_date):
    try:
        mobile = re.sub(r'[^\d+]', '', farmer_mobile)
        if mobile.startswith('+'):
            mobile = mobile[1:]

        antibiotics_info = []
        total_dosages = []
        for item in recommendation_items:
            antibiotics_info.append(item['antibiotic_name'])
            total_dosages.append(f"{item['total_daily_dosage_ml']}ml")

        medicine_names = ", ".join(antibiotics_info)
        dosage_details = ", ".join(total_dosages)
        frequency = str(recommendation_items[0]['daily_frequency']) if recommendation_items else "1"

        from_date = start_date.strftime("%d/%m/%Y") if hasattr(start_date, 'strftime') else str(start_date)
        to_date = end_date.strftime("%d/%m/%Y") if hasattr(end_date, 'strftime') else str(end_date)

        payload = {
            "token": WHATSAPP_API_TOKEN,
            "phone": mobile,
            "template_name": "agri_safe",
            "template_language": "en",
            "text1": str(farmer_name),
            "text2": str(medicine_names),
            "text3": str(dosage_details),
            "text4": str(frequency),
            "text5": str(from_date),
            "text6": str(to_date)
        }

        headers = {"Content-Type": "application/json"}

        if not WHATSAPP_ENABLED:
            return False, "WhatsApp messaging is disabled"

        max_retries = WHATSAPP_MAX_RETRIES
        timeout_seconds = WHATSAPP_TIMEOUT
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                response = requests.post(WHATSAPP_API_URL, headers=headers, json=payload, timeout=timeout_seconds)
                if response.status_code == 200:
                    return True, f"WhatsApp message sent successfully (attempt {attempt + 1})"
                elif response.status_code == 429:
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(retry_delay * 2)
                        continue
                else:
                    return False, f"Failed to send WhatsApp message: HTTP {response.status_code}"
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    import time
                    time.sleep(retry_delay)
                    retry_delay *= 1.5
                else:
                    return False, f"WhatsApp API timeout after {max_retries} attempts"
            except requests.exceptions.ConnectionError:
                if attempt < max_retries - 1:
                    import time
                    time.sleep(retry_delay)
                else:
                    return False, f"WhatsApp API connection failed after {max_retries} attempts"

    except Exception as e:
        return False, f"Unexpected error: {str(e)}"


# ==================== AUTH ROUTES ====================

@app.route('/api/auth/login', methods=['POST'])
def shop_login():
    try:
        data = request.get_json()
        if not data.get('mobile_no') or not data.get('password'):
            return jsonify({'error': 'Mobile number and password are required'}), 400

        shop = get_medical_shop_by_mobile(data['mobile_no'])
        if not shop or not check_password_hash(shop['password_hash'], data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401

        if not shop['is_active']:
            return jsonify({'error': 'Account is deactivated'}), 403

        token = generate_token(shop['id'], shop['shop_name'])
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'shop': {
                'id': shop['id'],
                'shop_name': shop['shop_name'],
                'owner_name': shop['owner_name']
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@app.route('/api/auth/signup', methods=['POST'])
def shop_signup():
    try:
        data = request.get_json()
        required_fields = ['shop_name', 'owner_name', 'mobile_no', 'password',
                           'license_number', 'pincode', 'address', 'city', 'state']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400

        existing_shop = get_medical_shop_by_mobile(data['mobile_no'])
        if existing_shop:
            return jsonify({'error': 'Mobile number already registered'}), 409

        if not re.match(r'^[+]?[1-9]\d{1,14}$', data['mobile_no']):
            return jsonify({'error': 'Invalid mobile number format'}), 400

        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400

        shop_data = {
            'shop_name': data['shop_name'],
            'owner_name': data['owner_name'],
            'mobile_no': data['mobile_no'],
            'email': data.get('email'),
            'license_number': data['license_number'],
            'pincode': data['pincode'],
            'address': data['address'],
            'city': data['city'],
            'state': data['state'],
            'password_hash': generate_password_hash(data['password']),
            'is_verified': False,
            'is_active': True
        }
        shop_id = create_medical_shop(shop_data)
        return jsonify({'message': 'Registered successfully', 'shop_id': shop_id}), 201
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@app.route('/api/auth/verify', methods=['GET'])
@login_required
def verify_token():
    return jsonify({'valid': True, 'shop_id': request.shop_id, 'shop_name': request.shop_name}), 200


# ==================== SHOP ROUTES ====================

@app.route('/api/shop/profile', methods=['GET'])
@login_required
def shop_profile():
    try:
        shop = get_medical_shop_by_id(request.shop_id)
        if not shop:
            return jsonify({'error': 'Shop not found'}), 404
        return jsonify({
            'shop': {
                'id': shop['id'],
                'shop_name': shop['shop_name'],
                'owner_name': shop['owner_name'],
                'phone_number': shop['mobile_no'],
                'email': shop['email'],
                'license_number': shop['license_number'],
                'pincode': shop['pincode'],
                'address': shop['address'],
                'district': shop['city'],
                'city': shop['city'],
                'state': shop['state'],
                'is_verified': shop['is_verified'],
                'is_active': shop['is_active'],
                'created_at': shop.get('created_at').isoformat() if shop.get('created_at') else None,
                'specializations': shop.get('specializations', '')
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 500


@app.route('/api/shop/profile', methods=['PUT'])
@login_required
def update_shop_profile():
    try:
        data = request.get_json()
        result = database.update_medical_shop_profile(request.shop_id, data)
        if result:
            return jsonify({'message': 'Profile updated successfully'}), 200
        return jsonify({'error': 'Failed to update profile'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500


@app.route('/api/shop/statistics', methods=['GET'])
@login_required
def get_shop_statistics_route():
    try:
        statistics = get_shop_statistics(request.shop_id)
        return jsonify({'statistics': statistics}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch statistics: {str(e)}'}), 500


@app.route('/api/shop/claimed-recommendations', methods=['GET'])
@login_required
def get_claimed_recommendations():
    try:
        shop_id = request.shop_id
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        per_page = min(per_page, 50)

        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        animal_type = request.args.get('animal_type')

        from_date_parsed = None
        to_date_parsed = None
        if from_date:
            try:
                from_date_parsed = datetime.strptime(from_date, '%Y-%m-%d').strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                pass
        if to_date:
            try:
                to_date_obj = datetime.strptime(to_date, '%Y-%m-%d') + timedelta(days=1)
                to_date_parsed = to_date_obj.strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                pass

        recommendations, total = get_recommendations_by_shop_id(
            shop_id=shop_id, page=page, per_page=per_page,
            from_date=from_date_parsed, to_date=to_date_parsed, animal_type=animal_type
        )

        recommendations_data = []
        for r in recommendations:
            farmer = get_farmer_by_id(r['farmer_id'])
            doctor = get_doctor_by_id(r['doctor_id'])
            claimed_shop = get_medical_shop_by_id(r['claimed_by_shop_id']) if r['claimed_by_shop_id'] else None
            recommendation_items = get_recommendation_items_by_recommendation_id(r['id'])

            items_data = []
            medicines_list = []
            for item in recommendation_items:
                if item['antibiotic_name'] and item['antibiotic_name'] != 'Placeholder - Update Required':
                    single_dose = item['single_dose_ml'] or 0
                    daily_freq = item['daily_frequency'] or 1
                    total_daily_dosage = single_dose * daily_freq
                    item_data = {
                        'antibiotic_name': item['antibiotic_name'],
                        'disease': item['disease'] or 'Not specified',
                        'animal_type': item['animal_type'] or 'Not specified',
                        'weight': item['weight'] or 0,
                        'age': item['age'] or 0,
                        'single_dose_ml': single_dose,
                        'daily_frequency': daily_freq,
                        'treatment_days': item['treatment_days'] or 1,
                        'total_treatment_dosage_ml': item['total_treatment_dosage_ml'] or 0,
                        'total_daily_dosage_ml': total_daily_dosage,
                        'start_date': item['start_date'].isoformat() if item['start_date'] else None,
                        'end_date': item['end_date'].isoformat() if item['end_date'] else None
                    }
                    items_data.append(item_data)
                    medicines_list.append(item['antibiotic_name'])

            rec_data = {
                'id': r['id'],
                'farmer_id': r['farmer_id'],
                'doctor_id': r['doctor_id'],
                'is_claimed': r['is_claimed'],
                'claimed_by_shop_id': r['claimed_by_shop_id'],
                'claimed_at': r['claimed_at'].isoformat() if r['claimed_at'] else None,
                'claim_notes': r['claim_notes'],
                'claimed_by_shop': {
                    'id': claimed_shop['id'],
                    'shop_name': claimed_shop['shop_name'],
                    'owner_name': claimed_shop['owner_name'],
                    'mobile_no': claimed_shop['mobile_no'],
                    'address': claimed_shop['address'],
                    'pincode': claimed_shop['pincode']
                } if claimed_shop else None,
                'farmer': {
                    'name': farmer['name'] if farmer else f'Farmer {r["farmer_id"]}',
                    'mobile_no': farmer['mobile_no'] if farmer else 'N/A',
                    'area': farmer['area'] if farmer else 'Unknown Area',
                    'pincode': farmer['pincode'] if farmer else 'N/A'
                },
                'farmer_name': farmer['name'] if farmer else f'Farmer {r["farmer_id"]}',
                'farmer_phone': farmer['mobile_no'] if farmer else 'N/A',
                'district': farmer['area'] if farmer else 'Unknown Area',
                'crop_name': items_data[0]['animal_type'] if items_data else 'N/A',
                'doctor': {
                    'name': doctor['doctor_name'] if doctor else f'Doctor {r["doctor_id"]}',
                    'hospital': doctor['hospital_name'] if doctor else 'Unknown Hospital',
                    'mobile_no': doctor['mobile_no'] if doctor else 'N/A',
                    'address': doctor['address'] if doctor else 'N/A'
                },
                'medicines': [{'medicine_name': m} for m in medicines_list],
                'items': items_data,
                'diagnosis': f'Medical consultation by Dr. {doctor["doctor_name"] if doctor else "Unknown"}'
            }
            recommendations_data.append(rec_data)

        total_pages = (total + per_page - 1) // per_page
        return jsonify({
            'recommendations': recommendations_data,
            'pagination': {
                'page': page, 'per_page': per_page, 'total': total,
                'pages': total_pages, 'has_prev': page > 1, 'has_next': page < total_pages
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch claimed recommendations: {str(e)}'}), 500


# ==================== RECOMMENDATION ROUTES ====================

@app.route('/api/recommendations/<int:recommendation_id>', methods=['GET'])
@login_required
def get_recommendation_details(recommendation_id):
    try:
        recommendation = get_recommendation_by_id(recommendation_id)
        if not recommendation:
            return jsonify({'error': 'Recommendation not found'}), 404

        farmer = get_farmer_by_id(recommendation['farmer_id'])
        doctor = get_doctor_by_id(recommendation['doctor_id'])
        claimed_shop = None
        if recommendation['is_claimed'] and recommendation['claimed_by_shop_id']:
            claimed_shop = get_medical_shop_by_id(recommendation['claimed_by_shop_id'])

        recommendation_items = get_recommendation_items_by_recommendation_id(recommendation['id'])
        items_data = []
        medicines_data = []
        for item in recommendation_items:
            if item['antibiotic_name'] and item['antibiotic_name'] != 'Placeholder - Update Required':
                single_dose = item['single_dose_ml'] or 0
                daily_freq = item['daily_frequency'] or 1
                item_data = {
                    'antibiotic_name': item['antibiotic_name'],
                    'disease': item['disease'] or 'Not specified',
                    'animal_type': item['animal_type'] or 'Not specified',
                    'weight': item['weight'] or 0,
                    'age': item['age'] or 0,
                    'single_dose_ml': single_dose,
                    'daily_frequency': daily_freq,
                    'treatment_days': item['treatment_days'] or 1,
                    'total_treatment_dosage_ml': item['total_treatment_dosage_ml'] or 0,
                    'total_daily_dosage_ml': single_dose * daily_freq
                }
                items_data.append(item_data)
                medicines_data.append({
                    'name': item['antibiotic_name'],
                    'dosage': f'{item["single_dose_ml"]}ml {item["daily_frequency"]} times daily' if item['single_dose_ml'] and item['daily_frequency'] else 'Dosage to be determined',
                    'duration': f'{item["treatment_days"]} days' if item['treatment_days'] else 'Duration to be determined'
                })

        return jsonify({
            'recommendation': {
                'id': recommendation['id'],
                'farmer_id': recommendation['farmer_id'],
                'doctor_id': recommendation['doctor_id'],
                'is_claimed': recommendation['is_claimed'],
                'claimed_by_shop_id': recommendation['claimed_by_shop_id'],
                'claimed_at': recommendation['claimed_at'].isoformat() if recommendation['claimed_at'] else None,
                'claim_notes': recommendation['claim_notes'],
                'claimed_by_shop': {
                    'id': claimed_shop['id'],
                    'shop_name': claimed_shop['shop_name'],
                    'owner_name': claimed_shop['owner_name'],
                    'mobile_no': claimed_shop['mobile_no'],
                    'address': claimed_shop['address'],
                    'pincode': claimed_shop['pincode']
                } if claimed_shop else None,
                'farmer': {
                    'name': farmer['name'] if farmer else f'Farmer {recommendation["farmer_id"]}',
                    'mobile_no': farmer['mobile_no'] if farmer else 'N/A',
                    'area': farmer['area'] if farmer else 'Unknown Area',
                    'pincode': farmer['pincode'] if farmer else 'N/A'
                },
                'doctor': {
                    'name': doctor['doctor_name'] if doctor else f'Doctor {recommendation["doctor_id"]}',
                    'hospital': doctor['hospital_name'] if doctor else 'Unknown Hospital',
                    'mobile_no': doctor['mobile_no'] if doctor else 'N/A',
                    'address': doctor['address'] if doctor else 'N/A',
                    'map_link': doctor['map_link'] if doctor else None
                },
                'medicines': medicines_data,
                'items': items_data,
                'diagnosis': f'Medical consultation by Dr. {doctor["doctor_name"] if doctor else "Unknown"}',
                'notes': f'Patient: {farmer["name"] if farmer else "Unknown"} from {farmer["area"] if farmer else "Unknown Area"}'
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch recommendation: {str(e)}'}), 500


@app.route('/api/recommendations/<int:recommendation_id>/claim', methods=['POST'])
@login_required
def claim_recommendation_route(recommendation_id):
    try:
        shop_id = request.shop_id
        recommendation = get_recommendation_by_id(recommendation_id)
        if not recommendation:
            return jsonify({'error': 'Recommendation not found'}), 404
        if recommendation['is_claimed']:
            return jsonify({'error': 'Recommendation already claimed'}), 400

        data = request.get_json() or {}
        start_date_str = data.get('start_date')
        notes = data.get('notes', '')
        if not start_date_str:
            return jsonify({'error': 'Start date is required'}), 400

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        recommendation_items = get_recommendation_items_by_recommendation_id(recommendation_id)
        if not recommendation_items:
            return jsonify({'error': 'No recommendation items found'}), 404

        max_treatment_days = max(item['treatment_days'] for item in recommendation_items if item['treatment_days'])
        end_date = start_date + timedelta(days=max_treatment_days - 1)
        claim_success = claim_recommendation(recommendation_id, shop_id, notes)
        if not claim_success:
            return jsonify({'error': 'Failed to claim recommendation'}), 500

        for item in recommendation_items:
            item_end_date = start_date + timedelta(days=item['treatment_days'] - 1)
            update_recommendation_item_dates(item['id'], start_date, item_end_date)

        # WhatsApp notification
        whatsapp_success = False
        whatsapp_message = ""
        try:
            farmer = get_farmer_by_id(recommendation['farmer_id'])
            if farmer and farmer['mobile_no']:
                success, message = send_whatsapp_message(
                    farmer_mobile=farmer['mobile_no'],
                    farmer_name=farmer['name'],
                    recommendation_items=recommendation_items,
                    start_date=start_date,
                    end_date=end_date
                )
                whatsapp_success = success
                whatsapp_message = message
            else:
                whatsapp_message = "Farmer mobile number not available"
        except Exception as e:
            whatsapp_message = f"WhatsApp error: {str(e)}"

        updated_recommendation = get_recommendation_by_id(recommendation_id)
        return jsonify({
            'message': 'Recommendation claimed successfully',
            'recommendation_id': recommendation_id,
            'shop_id': shop_id,
            'claimed_at': updated_recommendation['claimed_at'].isoformat() if updated_recommendation['claimed_at'] else datetime.now().isoformat(),
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'max_treatment_days': max_treatment_days,
            'notes': notes,
            'whatsapp_sent': whatsapp_success,
            'whatsapp_message': whatsapp_message
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to claim recommendation: {str(e)}'}), 500


@app.route('/api/recommendations/search', methods=['GET'])
@login_required
def search_recommendations():
    try:
        recommendations_result = search_unclaimed_recommendations()
        recommendations = recommendations_result['recommendations'] if isinstance(recommendations_result, dict) else recommendations_result[0]

        recommendations_data = []
        for r in recommendations:
            farmer = get_farmer_by_id(r['farmer_id'])
            doctor = get_doctor_by_id(r['doctor_id'])
            recommendation_items = get_recommendation_items_by_recommendation_id(r['id'])

            items_data = []
            medicines_data = []
            for item in recommendation_items:
                if item['antibiotic_name'] and item['antibiotic_name'] != 'Placeholder - Update Required':
                    single_dose = item['single_dose_ml'] or 0
                    daily_freq = item['daily_frequency'] or 1
                    item_data = {
                        'antibiotic_name': item['antibiotic_name'],
                        'disease': item['disease'] or 'Not specified',
                        'animal_type': item['animal_type'] or 'Not specified',
                        'weight': item['weight'] or 0,
                        'age': item['age'] or 0,
                        'single_dose_ml': single_dose,
                        'daily_frequency': daily_freq,
                        'treatment_days': item['treatment_days'] or 1,
                        'total_treatment_dosage_ml': item['total_treatment_dosage_ml'] or 0,
                        'total_daily_dosage_ml': single_dose * daily_freq
                    }
                    items_data.append(item_data)
                    medicines_data.append(item['antibiotic_name'])

            rec_data = {
                'id': r['id'],
                'farmer_id': r['farmer_id'],
                'doctor_id': r['doctor_id'],
                'is_claimed': r['is_claimed'],
                'farmer': {
                    'name': farmer['name'] if farmer else f'Farmer {r["farmer_id"]}',
                    'mobile_no': farmer['mobile_no'] if farmer else 'N/A',
                    'area': farmer['area'] if farmer else 'Unknown Area',
                    'pincode': farmer['pincode'] if farmer else 'N/A'
                },
                'doctor': {
                    'name': doctor['doctor_name'] if doctor else f'Doctor {r["doctor_id"]}',
                    'hospital': doctor['hospital_name'] if doctor else 'Unknown Hospital'
                },
                'medicines': medicines_data,
                'items': items_data,
                'diagnosis': f'Medical consultation by Dr. {doctor["doctor_name"] if doctor else "Unknown"}'
            }
            recommendations_data.append(rec_data)

        return jsonify({'recommendations': recommendations_data, 'total': len(recommendations)}), 200
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

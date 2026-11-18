import os
import json
import re
from flask import Flask, render_template, jsonify, request
from pypinyin import pinyin, Style

app = Flask(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '_', text)
    return text or 'song'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/songs', methods=['GET'])
def get_songs():
    """Lấy danh sách tất cả các bài hát có sẵn."""
    songs = []
    if os.path.exists(DATA_DIR):
        for fname in os.listdir(DATA_DIR):
            if fname.endswith('.json'):
                fpath = os.path.join(DATA_DIR, fname)
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        songs.append({
                            'id': data.get('id', fname.replace('.json', '')),
                            'title': data.get('title', 'Chưa đặt tên'),
                            'artist': data.get('artist', 'Chưa rõ'),
                            'difficulty': data.get('difficulty', 'Cơ bản'),
                            'youtube_id': data.get('youtube_id', ''),
                            'sentence_count': len(data.get('sentences', []))
                        })
                except Exception as e:
                    print(f"Lỗi đọc file {fname}: {e}")
    return jsonify({'success': True, 'songs': songs})

@app.route('/api/songs/<song_id>', methods=['GET'])
def get_song_detail(song_id):
    """Lấy chi tiết một bài hát theo ID."""
    fpath = os.path.join(DATA_DIR, f"{song_id}.json")
    if not os.path.exists(fpath):
        return jsonify({'success': False, 'message': 'Không tìm thấy bài hát'}), 404
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify({'success': True, 'song': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/parse_lyrics', methods=['POST'])
def parse_lyrics():
    """Tự động phân tích lời chữ Hán thành Pinyin và các chữ lẻ."""
    payload = request.get_json() or {}
    raw_lyrics = payload.get('lyrics', '')
    
    if not raw_lyrics.strip():
        return jsonify({'success': False, 'message': 'Lời bài hát trống'}), 400
    
    lines = [line.strip() for line in raw_lyrics.strip().split('\n') if line.strip()]
    parsed_sentences = []
    
    for idx, line in enumerate(lines, start=1):
        # Bóc tách từng chữ Hán
        words = []
        pinyins_list = pinyin(line, style=Style.TONE)
        
        char_idx = 0
        for char in line:
            if char.strip():
                py_val = pinyins_list[char_idx][0] if char_idx < len(pinyins_list) else ''
                words.append({
                    'hanzi': char,
                    'pinyin': py_val,
                    'meaning': ''
                })
                char_idx += 1
            else:
                char_idx += 1
                
        pinyin_full = ' '.join([w['pinyin'] for w in words])
        
        parsed_sentences.append({
            'id': idx,
            'hanzi': line,
            'pinyin': pinyin_full,
            'meaning': '',
            'start': 0.0,
            'end': 0.0,
            'words': words,
            'note': ''
        })
        
    return jsonify({'success': True, 'sentences': parsed_sentences})

@app.route('/api/songs', methods=['POST'])
def save_song():
    """Lưu hoặc cập nhật bài hát vào thư mục data."""
    payload = request.get_json() or {}
    song_id = payload.get('id') or slugify(payload.get('title', 'song'))
    payload['id'] = song_id
    
    fpath = os.path.join(DATA_DIR, f"{song_id}.json")
    try:
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return jsonify({'success': True, 'song_id': song_id, 'message': 'Đã lưu bài hát thành công!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Chạy trên máy cục bộ cổng 5000
    app.run(host='0.0.0.0', port=5000, debug=True)

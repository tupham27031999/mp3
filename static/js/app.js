/**
 * HÁN NGỮ CA ĐIỆU - APPLICATION ENGINE (v2.2)
 * Features:
 * - Ultra-Accurate Dual-Audio Controller (Paced Web Speech API + YouTube Audio Sync)
 * - Rock-Solid Karaoke Bouncing Ball Synchronizer (No early jumps, no CJK bugs)
 * - Full On-Web JSON Manager (Add, edit, import, export, delete songs directly)
 * - Word & Sentence Level Pronunciation with Tone Clarification
 */

let currentSong = null;
let currentSentenceIndex = 0;
let ytPlayer = null;
let ytReady = false;
let snippetTimer = null;
let aiSpeechTimer = null;
let karaokeAnimFrame = null;
let isLooping = false;

// YouTube IFrame API Callback
window.onYouTubeIframeAPIReady = function() {
  ytReady = true;
  if (currentSong && currentSong.youtube_id) {
    initYouTubePlayer(currentSong.youtube_id);
  }
};

function initYouTubePlayer(videoId) {
  if (!videoId) return;
  const cleanId = extractYouTubeId(videoId);
  
  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(cleanId);
  } else if (window.YT && window.YT.Player) {
    ytPlayer = new window.YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: cleanId,
      playerVars: {
        playsinline: 1,
        controls: 1,
        rel: 0
      },
      events: {
        onReady: () => { console.log('YouTube Player Ready'); }
      }
    });
  }
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return '';
  const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : urlOrId.trim();
}

/* ==========================================================================
   APP INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupJSONManager();
  
  // Load initial song
  const lastSongId = localStorage.getItem('last_song_id') || 'quan_son_tuu';
  loadSong(lastSongId);
});

function setupEventListeners() {
  // Navigation buttons
  document.getElementById('btn-prev-sentence').addEventListener('click', prevSentence);
  document.getElementById('btn-next-sentence').addEventListener('click', nextSentence);

  // Audio buttons
  document.getElementById('btn-play-ai').addEventListener('click', playAISpeech);
  document.getElementById('btn-play-singer').addEventListener('click', playSingerSnippet);
  document.getElementById('btn-loop-sentence').addEventListener('click', toggleLoop);

  // YouTube Toggle
  document.getElementById('yt-toggle-btn').addEventListener('click', () => {
    const box = document.getElementById('yt-player-box');
    const icon = document.getElementById('yt-toggle-icon');
    box.classList.toggle('open');
    icon.textContent = box.classList.contains('open') ? '▲' : '▼';
  });

  // Song Picker Modal
  const modalPicker = document.getElementById('modal-song-picker');
  document.getElementById('btn-song-picker').addEventListener('click', () => {
    loadSongList();
    modalPicker.classList.add('open');
  });
  document.getElementById('btn-close-picker').addEventListener('click', () => modalPicker.classList.remove('open'));

  // Add Song Modal
  const modalAdd = document.getElementById('modal-add-song');
  document.getElementById('btn-add-song').addEventListener('click', () => modalAdd.classList.add('open'));
  document.getElementById('btn-close-add').addEventListener('click', () => modalAdd.classList.remove('open'));
  document.getElementById('btn-submit-parse').addEventListener('click', submitNewSong);
}

/* ==========================================================================
   SONG LOADING & RENDERING
   ========================================================================== */
async function loadSong(songId) {
  try {
    const res = await fetch(`/api/songs/${songId}`);
    const data = await res.json();
    if (!data.success) {
      alert('Không tìm thấy bài hát!');
      return;
    }

    currentSong = data.song;
    currentSentenceIndex = 0;
    localStorage.setItem('last_song_id', songId);

    // Update Header Meta
    document.getElementById('song-title').textContent = currentSong.title;
    document.getElementById('song-artist').textContent = currentSong.artist;
    document.getElementById('badge-difficulty').textContent = currentSong.difficulty || 'Thực hành';
    document.getElementById('total-sentences-count').textContent = currentSong.sentences.length;

    // Load YouTube video
    if (currentSong.youtube_id && ytReady) {
      initYouTubePlayer(currentSong.youtube_id);
    }

    renderCurrentSentence();
    renderSentenceList();
  } catch (err) {
    console.error('Error loading song:', err);
  }
}

function renderCurrentSentence() {
  if (!currentSong || !currentSong.sentences.length) return;
  const sentence = currentSong.sentences[currentSentenceIndex];

  // Update Progress Counter
  document.getElementById('current-sentence-idx').textContent = currentSentenceIndex + 1;

  // 1. Render Word Breakdown Grid
  const grid = document.getElementById('word-grid');
  grid.innerHTML = '';
  sentence.words.forEach((w, wIdx) => {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.setAttribute('data-widx', wIdx);
    card.innerHTML = `
      <span class="pinyin-text">${w.pinyin || ''}</span>
      <span class="hanzi-char">${w.hanzi}</span>
      <span class="meaning-text">${w.meaning || ''}</span>
    `;
    // Click word to speak single character
    card.addEventListener('click', () => {
      speakWord(w.hanzi);
      highlightSingleWord(wIdx);
    });
    grid.appendChild(card);
  });

  // 2. Render Tip Box
  const tipContent = document.getElementById('tip-content');
  if (sentence.note) {
    tipContent.textContent = sentence.note;
    document.getElementById('tip-box').style.display = 'block';
  } else {
    document.getElementById('tip-box').style.display = 'none';
  }

  // 3. Render Karaoke Characters & Meaning
  const kChars = document.getElementById('karaoke-chars');
  kChars.innerHTML = '';
  Array.from(sentence.hanzi).forEach((char, idx) => {
    const span = document.createElement('span');
    span.className = 'k-char';
    span.id = `k-char-${idx}`;
    span.textContent = char;
    kChars.appendChild(span);
  });

  document.getElementById('sentence-translation').textContent = sentence.meaning || 'Chưa có bản dịch';

  // Reset Bouncing Ball
  stopKaraokeAnimation();

  // Highlight in bottom list
  updateActiveListItem();
}

function renderSentenceList() {
  const list = document.getElementById('sentence-list');
  list.innerHTML = '';
  currentSong.sentences.forEach((s, idx) => {
    const item = document.createElement('div');
    item.className = `sentence-item ${idx === currentSentenceIndex ? 'active' : ''}`;
    item.id = `sentence-item-${idx}`;
    item.innerHTML = `
      <div class="sentence-item-text">
        <span class="sentence-item-hanzi">${s.hanzi}</span>
        <span class="sentence-item-meaning">${s.meaning || ''}</span>
      </div>
      <span class="sentence-item-idx">#${idx + 1}</span>
    `;
    item.addEventListener('click', () => {
      currentSentenceIndex = idx;
      renderCurrentSentence();
    });
    list.appendChild(item);
  });
}

function updateActiveListItem() {
  document.querySelectorAll('.sentence-item').forEach((el, idx) => {
    el.classList.toggle('active', idx === currentSentenceIndex);
  });
}

function prevSentence() {
  if (currentSentenceIndex > 0) {
    currentSentenceIndex--;
    renderCurrentSentence();
  }
}

function nextSentence() {
  if (currentSong && currentSentenceIndex < currentSong.sentences.length - 1) {
    currentSentenceIndex++;
    renderCurrentSentence();
  }
}

/* ==========================================================================
   DUAL-AUDIO: 1. AI SPEECH SYNTHESIS (100% BULLETPROOF SYNC)
   ========================================================================== */
function speakWord(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  clearTimeout(aiSpeechTimer);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.5; // Phát âm chậm rõ cho từ lẻ
  window.speechSynthesis.speak(utterance);
}

function playAISpeech() {
  if (!('speechSynthesis' in window) || !currentSong) return;
  window.speechSynthesis.cancel();
  stopKaraokeAnimation();
  clearTimeout(aiSpeechTimer);

  const sentence = currentSong.sentences[currentSentenceIndex];
  const rate = parseFloat(document.getElementById('speed-select').value) || 0.4;
  const chars = Array.from(sentence.hanzi);
  const ball = document.getElementById('bouncing-ball');
  ball.classList.add('active');

  let charIdx = 0;

  // Thời gian tạm nghỉ sau khi dứt mỗi chữ (ms):
  // 0.25x -> 750ms nghỉ
  // 0.4x  -> 480ms nghỉ
  // 0.6x  -> 250ms nghỉ
  // 0.8x  -> 120ms nghỉ
  // 1.0x  -> 40ms nghỉ
  const pauseDelay = Math.max(30, Math.round(190 / rate));

  function speakNextChar() {
    if (charIdx >= chars.length) {
      stopKaraokeAnimation();
      if (isLooping) {
        aiSpeechTimer = setTimeout(playAISpeech, 1000);
      }
      return;
    }

    // 1. Chấm bi CHỈ NHẢY tới đúng chữ đang chuẩn bị phát âm!
    moveBallToCharIndex(charIdx);

    // 2. Tạo đối tượng đọc cho riêng chữ này
    const charUtterance = new SpeechSynthesisUtterance(chars[charIdx]);
    charUtterance.lang = 'zh-CN';
    charUtterance.rate = Math.max(0.4, Math.min(1.0, rate * 1.1));

    let hasAdvanced = false;

    // 3. SỰ KIỆN QUAN TRỌNG: CHỈ KHI DỨT TIẾNG CỦA CHỮ NÀY MỚI QUA CHỮ TIẾP THEO
    charUtterance.onend = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      charIdx++;
      aiSpeechTimer = setTimeout(speakNextChar, pauseDelay);
    };

    charUtterance.onerror = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      charIdx++;
      aiSpeechTimer = setTimeout(speakNextChar, 200);
    };

    // Đề phòng trường hợp hiếm hoi trình duyệt không phát sự kiện onend:
    // Timer an toàn 2.5 giây cho 1 chữ
    aiSpeechTimer = setTimeout(() => {
      if (!hasAdvanced) {
        hasAdvanced = true;
        charIdx++;
        speakNextChar();
      }
    }, 2500);

    window.speechSynthesis.speak(charUtterance);
  }

  // Bắt đầu đọc chữ thứ nhất
  speakNextChar();
}

/* ==========================================================================
   DUAL-AUDIO: 2. SINGER SNIPPET (YOUTUBE REALTIME AUDIO CLOCK SYNC)
   ========================================================================== */
function playSingerSnippet() {
  if (!ytPlayer || !ytPlayer.seekTo || !currentSong) {
    alert('Đang tải trình phát YouTube hoặc bài hát chưa có mã video!');
    return;
  }

  const sentence = currentSong.sentences[currentSentenceIndex];
  const start = parseFloat(sentence.start) || 0;
  const end = parseFloat(sentence.end) || (start + 5);
  const duration = Math.max(0.5, end - start);
  const charCount = sentence.hanzi.length;

  clearTimeout(snippetTimer);
  stopKaraokeAnimation();
  window.speechSynthesis.cancel();

  // Make YouTube player visible if hidden
  const box = document.getElementById('yt-player-box');
  if (!box.classList.contains('open')) {
    box.classList.add('open');
    document.getElementById('yt-toggle-icon').textContent = '▲';
  }

  ytPlayer.seekTo(start, true);
  ytPlayer.playVideo();

  const ball = document.getElementById('bouncing-ball');
  ball.classList.add('active');
  moveBallToCharIndex(0);

  // Poll YouTube's real audio clock: can never jump early or drift!
  function checkVideoProgress() {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
    
    const curr = ytPlayer.getCurrentTime();
    
    // Nếu đã tới mốc kết thúc câu:
    if (curr >= end) {
      ytPlayer.pauseVideo();
      stopKaraokeAnimation();
      if (isLooping) {
        snippetTimer = setTimeout(playSingerSnippet, 1000);
      }
      return;
    }

    // Nếu đang phát trong câu:
    if (curr >= start) {
      const progress = Math.max(0, Math.min(1, (curr - start) / duration));
      const activeCharIndex = Math.min(charCount - 1, Math.floor(progress * charCount));
      moveBallToCharIndex(activeCharIndex);
    } else {
      moveBallToCharIndex(0);
    }

    karaokeAnimFrame = requestAnimationFrame(checkVideoProgress);
  }

  karaokeAnimFrame = requestAnimationFrame(checkVideoProgress);
}

/* ==========================================================================
   BOUNCING BALL & HIGHLIGHT ENGINE
   ========================================================================== */
function moveBallToCharIndex(idx) {
  const targetChar = document.getElementById(`k-char-${idx}`);
  const container = document.getElementById('karaoke-container');
  const ball = document.getElementById('bouncing-ball');

  if (!targetChar || !container || !ball) return;

  // Highlight active character
  document.querySelectorAll('.k-char').forEach((c, cIdx) => {
    c.classList.toggle('active', cIdx === idx);
  });

  // Also highlight corresponding word in breakdown grid
  document.querySelectorAll('.word-card').forEach((w, wIdx) => {
    w.classList.toggle('active', wIdx === idx);
  });

  // Calculate ball X position
  const containerRect = container.getBoundingClientRect();
  const charRect = targetChar.getBoundingClientRect();
  const relativeX = (charRect.left - containerRect.left) + (charRect.width / 2) - 8;

  ball.style.setProperty('--ball-x', `${relativeX}px`);
}

function highlightSingleWord(idx) {
  document.querySelectorAll('.word-card').forEach((w, wIdx) => {
    w.classList.toggle('active', wIdx === idx);
  });
  document.querySelectorAll('.k-char').forEach((c, cIdx) => {
    c.classList.toggle('active', cIdx === idx);
  });
}

function stopKaraokeAnimation() {
  clearTimeout(snippetTimer);
  clearTimeout(aiSpeechTimer);
  if (karaokeAnimFrame) cancelAnimationFrame(karaokeAnimFrame);
  
  const ball = document.getElementById('bouncing-ball');
  if (ball) ball.classList.remove('active');

  document.querySelectorAll('.k-char').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.word-card').forEach(w => w.classList.remove('active'));
}

function toggleLoop() {
  isLooping = !isLooping;
  const btn = document.getElementById('btn-loop-sentence');
  btn.style.backgroundColor = isLooping ? '#ffc9c9' : '';
  btn.title = isLooping ? 'Đang bật lặp lại câu' : 'Lặp lại câu này';
}

/* ==========================================================================
   SONG PICKER & IMPORT WIZARD
   ========================================================================== */
async function loadSongList() {
  const container = document.getElementById('song-card-list');
  container.innerHTML = '<p>Đang tải danh sách...</p>';
  try {
    const res = await fetch('/api/songs');
    const data = await res.json();
    if (!data.success) return;

    container.innerHTML = '';
    data.songs.forEach(s => {
      const card = document.createElement('div');
      card.className = 'song-pick-item';
      card.innerHTML = `
        <div>
          <strong>${s.title}</strong>
          <div style="font-size: 12px; color: #6c757d;">${s.artist} • ${s.sentence_count} câu</div>
        </div>
        <span class="badge">${s.difficulty || 'Thực hành'}</span>
      `;
      card.addEventListener('click', () => {
        loadSong(s.id);
        document.getElementById('modal-song-picker').classList.remove('open');
      });
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<p>Lỗi tải danh sách bài hát.</p>';
  }
}

async function submitNewSong() {
  const title = document.getElementById('input-song-title').value.trim();
  const artist = document.getElementById('input-song-artist').value.trim() || 'Chưa rõ';
  const ytRaw = document.getElementById('input-song-youtube').value.trim();
  const lyrics = document.getElementById('input-song-lyrics').value.trim();

  if (!title || !lyrics) {
    alert('Vui lòng nhập tên bài hát và lời tiếng Trung!');
    return;
  }

  const btn = document.getElementById('btn-submit-parse');
  btn.disabled = true;
  btn.textContent = '⏳ Đang tự động phân tích Pinyin...';

  try {
    // 1. Parse Lyrics to Pinyin
    const parseRes = await fetch('/api/parse_lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics })
    });
    const parseData = await parseRes.json();
    if (!parseData.success) throw new Error(parseData.message);

    // 2. Save Song JSON
    const youtubeId = extractYouTubeId(ytRaw);
    const newSong = {
      title,
      artist,
      youtube_id: youtubeId,
      difficulty: 'Tự tạo',
      sentences: parseData.sentences
    };

    const saveRes = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSong)
    });
    const saveData = await saveRes.json();
    if (!saveData.success) throw new Error(saveData.message);

    alert('Đã thêm bài hát thành công!');
    document.getElementById('modal-add-song').classList.remove('open');
    loadSong(saveData.song_id);

    // Clear inputs
    document.getElementById('input-song-title').value = '';
    document.getElementById('input-song-lyrics').value = '';
  } catch (err) {
    alert('Lỗi: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Tự động phân tích & Lưu bài hát';
  }
}

/* ==========================================================================
   ON-WEB JSON MANAGER (EDIT, IMPORT, EXPORT, SAVE DIRECTLY)
   ========================================================================== */
function setupJSONManager() {
  const modal = document.getElementById('modal-json-manager');
  const btnOpen = document.getElementById('btn-json-manager');
  const btnClose = document.getElementById('btn-close-json');
  const selectSong = document.getElementById('select-json-song');
  const editor = document.getElementById('json-editor-content');
  const btnSave = document.getElementById('btn-save-raw-json');
  const btnNew = document.getElementById('btn-new-json-template');
  const fileUpload = document.getElementById('input-upload-json');
  const btnDownload = document.getElementById('btn-download-json');
  const btnDelete = document.getElementById('btn-delete-json-song');

  if (!btnOpen || !modal) return;

  // Open modal
  btnOpen.addEventListener('click', async () => {
    await populateJSONSongSelector();
    modal.classList.add('open');
  });

  btnClose.addEventListener('click', () => {
    modal.classList.remove('open');
    hideJSONAlert();
  });

  // Change song selection
  selectSong.addEventListener('change', async (e) => {
    const songId = e.target.value;
    if (songId === '__new__') {
      loadJSONTemplate();
    } else {
      await loadRawJSONForEditor(songId);
    }
  });

  // Template button
  btnNew.addEventListener('click', () => {
    selectSong.value = '__new__';
    loadJSONTemplate();
  });

  // Upload JSON from user device
  fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      editor.value = event.target.result;
      showJSONAlert('Đã nạp file thành công! Bạn có thể chỉnh sửa rồi bấm "Lưu Ngay Vào Máy Chủ".', 'success');
      selectSong.value = '__new__';
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Download JSON to user device
  btnDownload.addEventListener('click', () => {
    const content = editor.value.trim();
    if (!content) {
      alert('Chưa có nội dung để tải về!');
      return;
    }
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (selectSong.value !== '__new__' ? selectSong.value : 'bai_hat_moi') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Save Raw JSON to server
  btnSave.addEventListener('click', async () => {
    const content = editor.value.trim();
    if (!content) {
      showJSONAlert('Nội dung JSON không được để trống!', 'error');
      return;
    }

    try {
      // Validate syntax locally first
      const parsed = JSON.parse(content);
      if (!parsed.title || !parsed.sentences) {
        showJSONAlert('JSON thiếu trường bắt buộc: "title" hoặc danh sách "sentences"!', 'error');
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = '⏳ Đang lưu vào máy chủ...';

      const res = await fetch('/api/songs/save_raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_json: content })
      });
      const data = await res.json();

      if (data.success) {
        showJSONAlert(data.message || 'Đã lưu thành công!', 'success');
        await populateJSONSongSelector();
        selectSong.value = data.song_id;
        loadSong(data.song_id);
      } else {
        showJSONAlert('Lỗi: ' + data.message, 'error');
      }
    } catch (err) {
      showJSONAlert('Lỗi cú pháp JSON: ' + err.message, 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = '💾 Lưu Ngay Vào Máy Chủ';
    }
  });

  // Delete song
  btnDelete.addEventListener('click', async () => {
    const songId = selectSong.value;
    if (songId === '__new__') {
      alert('Vui lòng chọn bài hát cụ thể trong danh sách để xóa.');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa bài hát [${songId}] khỏi máy chủ không?`)) return;

    try {
      const res = await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showJSONAlert('Đã xóa bài hát thành công!', 'success');
        await populateJSONSongSelector();
        const firstOption = selectSong.querySelector('option:not([value="__new__"])');
        if (firstOption) {
          selectSong.value = firstOption.value;
          await loadRawJSONForEditor(firstOption.value);
          loadSong(firstOption.value);
        } else {
          loadJSONTemplate();
        }
      } else {
        showJSONAlert(data.message, 'error');
      }
    } catch (err) {
      showJSONAlert('Lỗi: ' + err.message, 'error');
    }
  });
}

async function populateJSONSongSelector() {
  const select = document.getElementById('select-json-song');
  select.innerHTML = '<option value="__new__">➕ Tạo bài mới từ JSON...</option>';
  try {
    const res = await fetch('/api/songs');
    const data = await res.json();
    if (!data.success) return;

    data.songs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.title} (${s.id}.json)`;
      select.appendChild(opt);
    });

    // Select current song if available
    if (currentSong && currentSong.id) {
      select.value = currentSong.id;
      await loadRawJSONForEditor(currentSong.id);
    } else {
      select.value = data.songs.length ? data.songs[0].id : '__new__';
      if (data.songs.length) {
        await loadRawJSONForEditor(data.songs[0].id);
      } else {
        loadJSONTemplate();
      }
    }
  } catch (err) {
    console.error('Error populating song selector:', err);
  }
}

async function loadRawJSONForEditor(songId) {
  const editor = document.getElementById('json-editor-content');
  editor.value = 'Đang tải dữ liệu...';
  try {
    const res = await fetch(`/api/songs/${songId}/raw`);
    const data = await res.json();
    if (data.success) {
      editor.value = data.raw_json;
      hideJSONAlert();
    } else {
      showJSONAlert('Không thể nạp nội dung bài hát này.', 'error');
    }
  } catch (err) {
    showJSONAlert('Lỗi kết nối tải JSON: ' + err.message, 'error');
  }
}

function loadJSONTemplate() {
  const editor = document.getElementById('json-editor-content');
  const template = {
    id: "ten_bai_viet_lien_khong_dau",
    title: "Tên Bài Hát (Chữ Hán)",
    artist: "Tên Ca Sĩ",
    youtube_id: "Ma_Video_YouTube",
    difficulty: "Cơ bản",
    sentences: [
      {
        id: 1,
        hanzi: "你好吗",
        pinyin: "nǐ hǎo ma",
        meaning: "Bạn khỏe không",
        start: 10.5,
        end: 14.0,
        words: [
          { hanzi: "你", pinyin: "nǐ", meaning: "bạn" },
          { hanzi: "好", pinyin: "hǎo", meaning: "tốt / khỏe" },
          { hanzi: "吗", pinyin: "ma", meaning: "không (từ hỏi)" }
        ],
        note: "Câu chào hỏi thông dụng nhất trong tiếng Trung."
      }
    ]
  };
  editor.value = JSON.stringify(template, null, 2);
  hideJSONAlert();
}

function showJSONAlert(msg, type) {
  const box = document.getElementById('json-status-alert');
  box.textContent = msg;
  box.className = `json-alert ${type}`;
  box.style.display = 'block';
}

function hideJSONAlert() {
  const box = document.getElementById('json-status-alert');
  box.style.display = 'none';
}

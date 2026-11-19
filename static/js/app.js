/**
 * HÁN NGỮ CA ĐIỆU - APPLICATION ENGINE
 * Features:
 * - Dual-Audio Controller (Web Speech API + YouTube Snippet Player)
 * - Karaoke Bouncing Ball Synchronizer
 * - Word & Sentence Level Pronunciation
 * - Song Picker & Auto-Pinyin Parser
 */

let currentSong = null;
let currentSentenceIndex = 0;
let ytPlayer = null;
let ytReady = false;
let snippetTimer = null;
let aiSpeechTimer = null;
let karaokeAnimFrame = null;
let isLooping = false;
let availableVoices = [];

// Initialize Web Speech API Voices
function initSpeechVoices() {
  if ('speechSynthesis' in window) {
    const loadVoices = () => {
      availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('zh'));
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }
}

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
  initSpeechVoices();
  setupEventListeners();
  
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

  // Modals
  const modalPicker = document.getElementById('modal-song-picker');
  const modalAdd = document.getElementById('modal-add-song');

  document.getElementById('btn-song-picker').addEventListener('click', () => {
    loadSongList();
    modalPicker.classList.add('open');
  });
  document.getElementById('btn-close-picker').addEventListener('click', () => modalPicker.classList.remove('open'));

  document.getElementById('btn-add-song').addEventListener('click', () => modalAdd.classList.add('open'));
  document.getElementById('btn-close-add').addEventListener('click', () => modalAdd.classList.remove('open'));

  // Submit New Song
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
   DUAL-AUDIO: 1. AI SPEECH SYNTHESIS (STANDARD PRONUNCIATION)
   ========================================================================== */
function speakWord(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  clearTimeout(aiSpeechTimer);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.5; // Đọc chậm, chuẩn và rõ thanh điệu cho từng từ lẻ
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

  // NẾU TỐC ĐỘ <= 0.5: ĐỌC TÁCH TỪNG CHỮ MỘT (Paced Reading)
  // Giúp người học nghe rõ từng âm tiết, từng thanh điệu, không bị líu lưỡi
  if (rate <= 0.5) {
    let charIdx = 0;
    // Khoảng cách nghỉ giữa các chữ: 0.25x -> 1200ms, 0.4x -> 850ms, 0.5x -> 700ms
    const intervalMs = Math.round(340 / rate);

    function speakNextChar() {
      if (charIdx >= chars.length) {
        stopKaraokeAnimation();
        if (isLooping) {
          aiSpeechTimer = setTimeout(playAISpeech, 1000);
        }
        return;
      }

      moveBallToCharIndex(charIdx);
      const charUtterance = new SpeechSynthesisUtterance(chars[charIdx]);
      charUtterance.lang = 'zh-CN';
      charUtterance.rate = 0.5; // Phát âm từng chữ một thật rõ nét
      window.speechSynthesis.speak(charUtterance);

      charIdx++;
      aiSpeechTimer = setTimeout(speakNextChar, intervalMs);
    }

    speakNextChar();
    return;
  }

  // NẾU TỐC ĐỘ > 0.5: ĐỌC LIỀN CÂU THEO NGỮ ĐIỆU BÌNH THƯỜNG
  const utterance = new SpeechSynthesisUtterance(sentence.hanzi);
  utterance.lang = 'zh-CN';
  utterance.rate = rate;

  // Track boundary event to move bouncing ball
  utterance.onboundary = (e) => {
    if (e.name === 'word' || e.charIndex !== undefined) {
      moveBallToCharIndex(e.charIndex);
    }
  };

  utterance.onstart = () => {
    moveBallToCharIndex(0);
  };

  utterance.onend = () => {
    stopKaraokeAnimation();
    if (isLooping) {
      aiSpeechTimer = setTimeout(playAISpeech, 800);
    }
  };

  window.speechSynthesis.speak(utterance);
}

/* ==========================================================================
   DUAL-AUDIO: 2. SINGER SNIPPET (YOUTUBE PLAYER)
   ========================================================================== */
function playSingerSnippet() {
  if (!ytPlayer || !ytPlayer.seekTo || !currentSong) {
    alert('Đang tải trình phát YouTube hoặc bài hát chưa có mã video!');
    return;
  }

  const sentence = currentSong.sentences[currentSentenceIndex];
  const start = parseFloat(sentence.start) || 0;
  const end = parseFloat(sentence.end) || (start + 5);
  const duration = Math.max(1, end - start);

  clearTimeout(snippetTimer);
  stopKaraokeAnimation();
  window.speechSynthesis.cancel();

  // Make YouTube player visible if hidden
  const box = document.getElementById('yt-player-box');
  if (!box.classList.contains('open')) {
    box.classList.add('open');
    document.getElementById('yt-toggle-icon').textContent = '▲';
  }

  // Seek and play
  ytPlayer.seekTo(start, true);
  ytPlayer.playVideo();

  const ball = document.getElementById('bouncing-ball');
  ball.classList.add('active');

  // Animate bouncing ball across characters based on time
  const startTime = Date.now();
  const charCount = sentence.hanzi.length;

  function syncBallWithVideo() {
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min(1, elapsed / duration);
    const activeCharIndex = Math.min(charCount - 1, Math.floor(progress * charCount));
    
    moveBallToCharIndex(activeCharIndex);

    if (elapsed < duration) {
      karaokeAnimFrame = requestAnimationFrame(syncBallWithVideo);
    }
  }
  karaokeAnimFrame = requestAnimationFrame(syncBallWithVideo);

  // Stop video at end of sentence
  snippetTimer = setTimeout(() => {
    ytPlayer.pauseVideo();
    stopKaraokeAnimation();
    if (isLooping) {
      setTimeout(playSingerSnippet, 1000);
    }
  }, duration * 1000);
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

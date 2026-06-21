import { apiFetch, getUser, showToast } from './utils.js';
import { renderProfile } from './profile.js';

let currentLocationId = null;

export function openSidebar(locationId) {
  const loc = window.locationsMap?.[locationId];
  if (!loc) return;
  currentLocationId = locationId;
  window.currentLocationId = locationId;

  document.getElementById('sidebarImage').src = loc.image_url || 'https://via.placeholder.com/400x220?text=Немає+зображення';
  document.getElementById('sidebarTitle').textContent = loc.name;
  document.getElementById('sidebarDesc').textContent = loc.description;
  document.getElementById('sidebarWiki').href = loc.wiki_url || '#';
  document.getElementById('sidebar').classList.add('open');
  updateSidebarButtons();
  loadReviewsForLocation(locationId);
}

export async function updateSidebarButtons() {
  if (!currentLocationId) {
    document.getElementById('favBtn').disabled = true;
    document.getElementById('visitedBtn').disabled = true;
    return;
  }
  const user = getUser();
  if (!user) {
    document.getElementById('favBtn').disabled = true;
    document.getElementById('visitedBtn').disabled = true;
    document.getElementById('favBtn').textContent = '❤️ Додати в улюблене';
    document.getElementById('visitedBtn').textContent = '✅ Додати у відвідано';
    document.getElementById('sidebarStatus').textContent = 'Увійдіть, щоб керувати списками';
    return;
  }
  try {
    const lists = await apiFetch('user-lists/');
    const favExists = lists.some(item => item.location === currentLocationId && item.list_type === 'favorite');
    const visExists = lists.some(item => item.location === currentLocationId && item.list_type === 'visited');
    const favBtn = document.getElementById('favBtn');
    const visitedBtn = document.getElementById('visitedBtn');
    favBtn.disabled = false;
    visitedBtn.disabled = false;
    favBtn.textContent = favExists ? '❤️ Видалити з улюблених' : '❤️ Додати в улюблене';
    visitedBtn.textContent = visExists ? '✅ Видалити з відвіданих' : '✅ Додати у відвідано';
    document.getElementById('sidebarStatus').textContent = favExists || visExists ? 'Це місце вже у ваших списках' : 'Додайте до списків';
  } catch (err) {
    console.error(err);
  }
}

export async function loadReviewsForLocation(locationId) {
  try {
    const data = await apiFetch(`reviews/?location=${locationId}`);
    renderReviews(data);
    checkUserReview(data);
  } catch (err) {
    console.error('Помилка завантаження відгуків:', err);
    document.getElementById('reviewsList').innerHTML = '<p style="color:#999;">Не вдалося завантажити відгуки</p>';
  }
}

function renderReviews(reviews) {
  const list = document.getElementById('reviewsList');
  const avgSpan = document.getElementById('avgRating');
  if (reviews.length === 0) {
    list.innerHTML = '<p style="color:#999;">Поки немає відгуків. Будьте першим!</p>';
    avgSpan.textContent = '(⭐ 0.0)';
    return;
  }
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = (total / reviews.length).toFixed(1);
  avgSpan.textContent = `(⭐ ${avg})`;

  const user = getUser();
  let html = '';
  reviews.forEach(r => {
    const stars = '⭐'.repeat(r.rating);
    const date = new Date(r.created_at).toLocaleDateString('uk-UA');
    const isOwn = user && r.username === user.username;
    html += `<div class="review-item" data-review-id="${r.id}">`;
    html += `
      <div class="review-header">
        <span><strong>${r.username}</strong> ${stars}</span>
        <span style="font-size:12px; color:#9ca3af;">${date}</span>
      </div>
      <div class="review-comment" id="review-comment-${r.id}">${r.comment || ''}</div>
    `;
    if (isOwn) {
      html += `
        <div class="review-actions">
          <button class="edit-btn" data-id="${r.id}">Редагувати</button>
          <button class="delete-btn" data-id="${r.id}">Видалити</button>
        </div>
        <div class="edit-review-form" id="edit-form-${r.id}" style="display:none;">
          <select class="edit-rating" data-id="${r.id}">
            ${[5,4,3,2,1].map(v => `<option value="${v}" ${v===r.rating?'selected':''}>${'⭐'.repeat(v)} ${v}</option>`).join('')}
          </select>
          <textarea class="edit-comment" data-id="${r.id}" rows="2">${r.comment || ''}</textarea>
          <div style="margin-top:4px;">
            <button class="save-btn" data-id="${r.id}">Зберегти</button>
            <button class="cancel-btn" data-id="${r.id}">Скасувати</button>
          </div>
        </div>
      `;
    }
    html += '</div>';
  });
  list.innerHTML = html;

  attachHandlers(list, 'edit-form-');
}

function attachHandlers(container, editPrefix) {
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      document.getElementById(`${editPrefix}${id}`).style.display = 'block';
      this.style.display = 'none';
    });
  });
  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      document.getElementById(`${editPrefix}${id}`).style.display = 'none';
      document.querySelector(`.edit-btn[data-id="${id}"]`).style.display = 'inline-block';
    });
  });
  container.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.dataset.id;
      const rating = document.querySelector(`.edit-rating[data-id="${id}"]`).value;
      const comment = document.querySelector(`.edit-comment[data-id="${id}"]`).value.trim();
      try {
        await apiFetch(`reviews/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ rating: parseInt(rating), comment })
        });
        showToast('Відгук оновлено');
        loadReviewsForLocation(currentLocationId);
        if (document.getElementById('profilePage').classList.contains('active')) renderProfile();
      } catch (err) {
        showToast('Помилка оновлення відгуку');
      }
    });
  });
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id = this.dataset.id;
      if (!confirm('Видалити цей відгук?')) return;
      try {
        await apiFetch(`reviews/${id}/`, { method: 'DELETE' });
        showToast('Відгук видалено');
        loadReviewsForLocation(currentLocationId);
        if (document.getElementById('profilePage').classList.contains('active')) renderProfile();
      } catch (err) {
        showToast('Помилка видалення відгуку');
      }
    });
  });
}

async function checkUserReview(reviews) {
  const user = getUser();
  const container = document.getElementById('reviewFormContainer');
  const status = document.getElementById('reviewStatus');
  if (!user) {
    container.style.display = 'none';
    status.textContent = 'Увійдіть, щоб залишити відгук';
    return;
  }
  const myReview = reviews.find(r => r.username === user.username);
  if (myReview) {
    container.style.display = 'none';
    status.textContent = 'Ви вже залишили відгук для цієї локації';
  } else {
    container.style.display = 'block';
    status.textContent = '';
  }
}

// Додавання відгуку
document.getElementById('submitReviewBtn').addEventListener('click', async function () {
  const user = getUser();
  if (!user) { showToast('Будь ласка, увійдіть'); return; }
  if (!currentLocationId) return;
  const rating = parseInt(document.getElementById('ratingSelect').value);
  const comment = document.getElementById('commentInput').value.trim();
  try {
    await apiFetch('reviews/', {
      method: 'POST',
      body: JSON.stringify({ location: currentLocationId, rating, comment })
    });
    showToast('Відгук додано!');
    document.getElementById('commentInput').value = '';
    loadReviewsForLocation(currentLocationId);
    if (document.getElementById('profilePage').classList.contains('active')) renderProfile();
  } catch (err) {
    if (err.message.includes('400')) {
      showToast('Ви вже залишили відгук для цієї локації');
    } else {
      showToast('Помилка при додаванні відгуку');
    }
  }
});

// Кнопки списків
document.getElementById('favBtn').addEventListener('click', async function () {
  if (!currentLocationId) return;
  await toggleList(currentLocationId, 'favorite');
});
document.getElementById('visitedBtn').addEventListener('click', async function () {
  if (!currentLocationId) return;
  await toggleList(currentLocationId, 'visited');
});

async function toggleList(locationId, listType) {
  const user = getUser();
  if (!user) { showToast('Будь ласка, увійдіть'); return; }
  try {
    const lists = await apiFetch('user-lists/');
    const existing = lists.find(item => item.location === locationId && item.list_type === listType);
    if (existing) {
      await apiFetch(`user-lists/${existing.id}/`, { method: 'DELETE' });
      showToast(`Видалено з ${listType === 'favorite' ? 'улюблених' : 'відвіданих'}`);
    } else {
      await apiFetch('user-lists/', {
        method: 'POST',
        body: JSON.stringify({ location: locationId, list_type: listType })
      });
      showToast(`Додано до ${listType === 'favorite' ? 'улюблених' : 'відвіданих'}`);
    }
    updateSidebarButtons();
    if (document.getElementById('profilePage').classList.contains('active')) renderProfile();
  } catch (err) {
    console.error(err);
    showToast('Помилка при роботі зі списком');
  }
}

// Закриття бічної панелі
document.getElementById('closeSidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});
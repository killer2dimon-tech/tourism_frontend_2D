import { apiFetch, getUser, showToast } from './utils.js';
import { getLocationsMap, goToLocation } from './map.js';
import { loadReviewsForLocation, updateSidebarButtons } from './reviews.js';

export async function renderProfile() {
  const user = getUser();
  if (!user) return;
  const favList = document.getElementById('favoritesList');
  const visList = document.getElementById('visitedList');
  const myReviewsList = document.getElementById('myReviewsList');
  const myProposalsList = document.getElementById('myProposalsList');

  try {
    // ---- Списки "Улюблене" та "Відвідано" ----
    const lists = await apiFetch('user-lists/');
    const favs = lists.filter(item => item.list_type === 'favorite');
    const visited = lists.filter(item => item.list_type === 'visited');

    function renderList(container, items, listType) {
      if (items.length === 0) {
        container.innerHTML = '<li style="color:#999;">Немає доданих місць</li>';
        return;
      }
      const locationsMap = getLocationsMap();
      container.innerHTML = items.map(item => {
        const loc = locationsMap[item.location];
        if (!loc) return '';
        return `<li>
          <span class="location-link" data-id="${loc.id}">${loc.name}</span>
          <button class="remove-btn" data-id="${item.id}" data-list="${listType}">Видалити</button>
        </li>`;
      }).join('');
      container.querySelectorAll('.location-link').forEach(el => {
        el.addEventListener('click', function() {
          goToLocation(parseInt(this.dataset.id));
        });
      });
      container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
          const id = parseInt(this.dataset.id);
          try {
            await apiFetch(`user-lists/${id}/`, { method: 'DELETE' });
            showToast('Видалено зі списку');
            renderProfile();
            updateSidebarButtons();
          } catch (err) {
            showToast('Помилка видалення');
          }
        });
      });
    }

    renderList(favList, favs, 'favorite');
    renderList(visList, visited, 'visited');

    // ---- Відгуки користувача ----
    const myReviews = await apiFetch('reviews/my_reviews/');
    if (myReviews.length === 0) {
      myReviewsList.innerHTML = '<li style="color:#999;">Ви ще не залишили жодного відгуку</li>';
    } else {
      const locationsMap = getLocationsMap();
      myReviewsList.innerHTML = myReviews.map(r => {
        const stars = '⭐'.repeat(r.rating);
        const date = new Date(r.created_at).toLocaleDateString('uk-UA');
        return `<li>
          <span class="location-link" data-id="${r.location}">${r.location_name}</span>
          <span>${stars}</span>
          <span style="font-size:13px; color:#4b5563;">${r.comment || ''}</span>
          <span style="font-size:12px; color:#9ca3af;">${date}</span>
          <div class="review-actions" style="display:inline-block;">
            <button class="edit-btn" data-id="${r.id}">Редагувати</button>
            <button class="delete-btn" data-id="${r.id}">Видалити</button>
          </div>
          <div class="edit-review-form" id="profile-edit-${r.id}" style="display:none; margin-top:6px;">
            <select class="edit-rating" data-id="${r.id}">
              ${[5,4,3,2,1].map(v => `<option value="${v}" ${v===r.rating?'selected':''}>${'⭐'.repeat(v)} ${v}</option>`).join('')}
            </select>
            <textarea class="edit-comment" data-id="${r.id}" rows="2">${r.comment || ''}</textarea>
            <div>
              <button class="save-btn" data-id="${r.id}">Зберегти</button>
              <button class="cancel-btn" data-id="${r.id}">Скасувати</button>
            </div>
          </div>
        </li>`;
      }).join('');

      myReviewsList.querySelectorAll('.location-link').forEach(el => {
        el.addEventListener('click', function() {
          goToLocation(parseInt(this.dataset.id));
        });
      });

      attachReviewHandlers(myReviewsList, 'profile-edit-');
    }

    // ---- ЗАПИТИ НА ЛОКАЦІЇ ----
    const proposals = await apiFetch('location-proposals/');
    if (proposals.length === 0) {
      myProposalsList.innerHTML = '<li style="color:#999;">Ви ще не подавали запитів</li>';
    } else {
      // Сортуємо: спочатку pending, потім інші (approved, rejected)
      const sorted = [...proposals].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return 0;
      });

      const statusMap = {
        'pending': '⏳ На розгляді',
        'approved': '✅ Схвалено',
        'rejected': '❌ Відхилено'
      };

      myProposalsList.innerHTML = sorted.map(p => {
        const statusText = statusMap[p.status] || p.status;
        const date = new Date(p.created_at).toLocaleDateString('uk-UA');
        return `<li>
          <span><strong>${p.name}</strong> – ${statusText}</span>
          <span style="font-size:12px; color:#9ca3af;">${date}</span>
        </li>`;
      }).join('');
    }

  } catch (err) {
    console.error(err);
    favList.innerHTML = '<li>Помилка завантаження</li>';
    visList.innerHTML = '<li>Помилка завантаження</li>';
    myReviewsList.innerHTML = '<li>Помилка завантаження відгуків</li>';
    myProposalsList.innerHTML = '<li>Помилка завантаження запитів</li>';
  }
}

// Допоміжна функція для прив'язки обробників редагування/видалення
function attachReviewHandlers(container, editPrefix) {
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
        renderProfile();
        if (window.currentLocationId) loadReviewsForLocation(window.currentLocationId);
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
        renderProfile();
        if (window.currentLocationId) loadReviewsForLocation(window.currentLocationId);
      } catch (err) {
        showToast('Помилка видалення відгуку');
      }
    });
  });
}

// Обробник кнопки "Запропонувати нову локацію"
document.getElementById('proposeLocationBtn').addEventListener('click', function() {
  openProposeModal();
});

function openProposeModal() {
  document.getElementById('proposeModal').classList.add('active');
  document.getElementById('proposeForm').reset();
  document.getElementById('proposeError').style.display = 'none';
}

// Закриття модалки
document.querySelector('#proposeModal .close-modal').addEventListener('click', function() {
  document.getElementById('proposeModal').classList.remove('active');
});
window.addEventListener('click', function(e) {
  if (e.target.id === 'proposeModal') {
    e.target.classList.remove('active');
  }
});

// Відправка форми
document.getElementById('proposeForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const user = getUser();
  if (!user) {
    showToast('Будь ласка, увійдіть');
    return;
  }

  const name = document.getElementById('propName').value.trim();
  const description = document.getElementById('propDesc').value.trim();
  const latitude = parseFloat(document.getElementById('propLat').value);
  const longitude = parseFloat(document.getElementById('propLng').value);
  const category = document.getElementById('propCategory').value;
  const image_url = document.getElementById('propImage').value.trim() || null;
  const wiki_url = document.getElementById('propWiki').value.trim() || null;

  const errorEl = document.getElementById('proposeError');
  errorEl.style.display = 'none';

  if (!name || !description || isNaN(latitude) || isNaN(longitude) || !category) {
    errorEl.textContent = 'Заповніть усі обов\'язкові поля';
    errorEl.style.display = 'block';
    return;
  }

  try {
    await apiFetch('location-proposals/', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        latitude,
        longitude,
        category,
        image_url,
        wiki_url
      })
    });
    showToast('Запит надіслано! Очікуйте підтвердження адміністратора.');
    document.getElementById('proposeModal').classList.remove('active');
    document.getElementById('proposeForm').reset();
  } catch (err) {
    errorEl.textContent = err.message || 'Помилка надсилання запиту';
    errorEl.style.display = 'block';
  }
});
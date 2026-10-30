const TOTAL_PHOTOS = 68;
const BTS_CAT_POSES = [
    { pos: 'cat-top', icon: '#cat-pose-top' },
    { pos: 'cat-side-right', icon: '#cat-pose-side' },
    { pos: 'cat-top-left', icon: '#cat-pose-top' },
    { pos: 'cat-side-left', icon: '#cat-pose-side' },
    { pos: 'cat-top', icon: '#cat-pose-top' },
    { pos: 'cat-side-left', icon: '#cat-pose-side' },
    { pos: 'cat-top-left', icon: '#cat-pose-top' }
];

const pad3 = n => String(n).padStart(3, '0');
const isPdfMode = window.location.search.includes('pdf');
const photoMap = new Map();

/* =========================================================
   1. GRANA ANALOGICA 35MM SU CANVAS
   ========================================================= */
(function initFilmGrain() {
    const size = 180;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const n = ((Math.random() + Math.random()) * 0.5) * 255;
        data[i] = data[i + 1] = data[i + 2] = n;
        data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    document.documentElement.style.setProperty('--grain-url', `url(${canvas.toDataURL('image/png')})`);
})();

/* =========================================================
   2. HERO VIDEO YOUTUBE, STRISCE VIDEO, REEL E CREDITI PERMANENTI
   ========================================================= */
let heroPlayer = null;
let heroReady = false;
let stripVideoPlaying = false;

const heroContainer = document.getElementById('heroContainer');
const heroSoundBtn = document.getElementById('heroSoundBtn');

window.onYouTubeIframeAPIReady = function () {
    if (isPdfMode) return;
    heroPlayer = new YT.Player('heroIframe', {
        events: {
            onReady: e => {
                heroReady = true;
                e.target.mute();
                e.target.playVideo();
            }
        }
    });
};

function setHeroAudio(unmute) {
    if (!heroReady || !heroPlayer || typeof heroPlayer.unMute !== 'function') return;
    if (unmute) {
        pauseAllMedia();
        heroPlayer.unMute();
        heroPlayer.setVolume(100);
        heroPlayer.playVideo();
        heroSoundBtn.classList.add('unmuted');
        heroSoundBtn.title = 'Disattiva audio';
    } else {
        heroPlayer.mute();
        heroSoundBtn.classList.remove('unmuted');
        heroSoundBtn.title = 'Attiva audio';
    }
}

heroSoundBtn.addEventListener('click', e => {
    e.stopPropagation();
    heroContainer.classList.add('interactive');
    setHeroAudio(!heroSoundBtn.classList.contains('unmuted'));
});

document.getElementById('heroOverlay').addEventListener('click', () => {
    heroContainer.classList.add('interactive');
    setHeroAudio(true);
});

if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
        if (!heroReady || !heroPlayer) return;
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                if (typeof heroPlayer.pauseVideo === 'function') heroPlayer.pauseVideo();
            } else if (!stripVideoPlaying) {
                if (typeof heroPlayer.playVideo === 'function') heroPlayer.playVideo();
            }
        });
    }, { threshold: 0.12 }).observe(heroContainer);
}

/* Ferma la riproduzione degli altri video/reel, ma NON rimuove .is-active dai crediti */
function pauseAllMedia(exceptEl = null) {
    document.querySelectorAll('.video-item.playing iframe').forEach(iframe => {
        if (exceptEl && exceptEl.contains(iframe)) return;
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    });

    document.querySelectorAll('.reel-item.playing').forEach(reel => {
        if (reel === exceptEl) return;
        const id = reel.dataset.reelId;
        const thumb = reel.dataset.reelThumb;
        const fallback = reel.dataset.reelFallback;
        reel.classList.remove('playing');
        reel.innerHTML = `
            <a class="pdf-video-link" href="https://www.instagram.com/reel/${id}/" target="_blank" rel="noopener"></a>
            <img class="video-thumb" src="${thumb}" onerror="this.onerror=null;this.src='${fallback}';" alt="Reel" loading="lazy" decoding="async">
            <div class="custom-play-btn"><svg><use href="#star-play-icon"></use></svg></div>
        `;
    });
}

function playStripVideo(videoItem) {
    pauseAllMedia(videoItem);
    stripVideoPlaying = true;
    setHeroAudio(false);
    if (heroReady && heroPlayer && typeof heroPlayer.pauseVideo === 'function') heroPlayer.pauseVideo();

    videoItem.classList.add('playing');
    const card = videoItem.closest('.media-card');
    if (card) card.classList.add('is-active');

    const id = videoItem.dataset.videoId;
    videoItem.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&autoplay=1&controls=1&rel=0&modestbranding=1" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

function playStripReel(reelItem) {
    pauseAllMedia(reelItem);
    stripVideoPlaying = true;
    setHeroAudio(false);
    if (heroReady && heroPlayer && typeof heroPlayer.pauseVideo === 'function') heroPlayer.pauseVideo();

    reelItem.classList.add('playing');
    const card = reelItem.closest('.media-card');
    if (card) card.classList.add('is-active');

    const id = reelItem.dataset.reelId;
    reelItem.innerHTML = `<iframe class="ig-embed-clean" src="https://www.instagram.com/reel/${id}/embed/" title="Instagram Reel" allow="autoplay; encrypted-media" scrolling="no"></iframe>`;
}

/* =========================================================
   3. DELEGA EVENTI GLOBALE (VIDEO, REEL, BACKSTAGE, COPIA CONTATTI)
   ========================================================= */
document.addEventListener('click', e => {
    const videoItem = e.target.closest('.video-item:not(.playing)');
    if (videoItem) {
        playStripVideo(videoItem);
        return;
    }

    const reelItem = e.target.closest('.reel-item:not(.playing)');
    if (reelItem) {
        playStripReel(reelItem);
        return;
    }

    const catBtn = e.target.closest('.cat-toggle-btn');
    if (catBtn) {
        catBtn.classList.remove('pop-anim');
        void catBtn.offsetWidth;
        catBtn.classList.add('pop-anim');

        const wrapper = catBtn.closest('.video-strip-wrapper');
        const layer = wrapper.querySelector('.bts-layer');

        if (!layer.hasChildNodes()) {
            const startNum = parseInt(wrapper.dataset.btsStart, 10);
            BTS_CAT_POSES.forEach((cfg, idx) => {
                const code = pad3(startNum + idx);
                const card = document.createElement('div');
                card.className = `bts-card bts-pos-${idx + 1}`;
                card.style.transitionDelay = `${idx * 0.055}s`;
                card.innerHTML = `
                    <svg class="leaning-cat ${cfg.pos}"><use href="${cfg.icon}"></use></svg>
                    <img src="img/webp/bts${code}.webp" onerror="this.onerror=null;this.src='img/bts${code}.jpg';" alt="Backstage ${code}" loading="lazy" decoding="async">
                `;
                layer.appendChild(card);
            });

            void layer.offsetWidth;
            setTimeout(() => {
                wrapper.classList.add('show-bts');
                catBtn.classList.add('active');
                catBtn.setAttribute('aria-expanded', 'true');
            }, 30);
        } else {
            const isShown = wrapper.classList.toggle('show-bts');
            catBtn.classList.toggle('active', isShown);
            catBtn.setAttribute('aria-expanded', isShown);
        }
        return;
    }

    const copyLink = e.target.closest('[data-copy]');
    if (copyLink) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (copyLink.dataset.alwaysCopy === 'true' || !isMobile) {
            e.preventDefault();
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(copyLink.dataset.copy).catch(() => {});
        }
        const toast = copyLink.querySelector('.copy-toast');
        if (toast) {
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }
    }
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const videoItem = e.target.closest('.video-item:not(.playing)');
    if (videoItem) {
        e.preventDefault();
        playStripVideo(videoItem);
        return;
    }
    const reelItem = e.target.closest('.reel-item:not(.playing)');
    if (reelItem) {
        e.preventDefault();
        playStripReel(reelItem);
    }
});

/* =========================================================
   4. CASSETTO BIO E PULSANTE VIAGGIO (AEROPLANINO / PALLONCINO)
   ========================================================= */
const bioArrowBtn = document.getElementById('bioArrowBtn');
const bioDrawer = document.getElementById('bioDrawer');

bioArrowBtn.addEventListener('click', () => {
    const isOpen = bioArrowBtn.classList.toggle('open');
    bioDrawer.classList.toggle('open', isOpen);
    bioArrowBtn.setAttribute('aria-expanded', isOpen);
});

let scrollAnimId = null;
function stopCustomScroll() {
    if (scrollAnimId) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
    }
}

window.addEventListener('wheel', stopCustomScroll, { passive: true });
window.addEventListener('touchstart', stopCustomScroll, { passive: true });

function smoothScrollPage(toTop, duration, onComplete) {
    stopCustomScroll();
    const startY = window.scrollY;
    if (toTop && startY < 8) return;
    const startTime = performance.now();

    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        if (toTop) {
            window.scrollTo(0, startY * (1 - ease));
        } else {
            const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            window.scrollTo(0, startY + (maxScroll - startY) * ease);
        }

        if (progress < 1) {
            scrollAnimId = requestAnimationFrame(step);
        } else {
            if (!toTop) window.scrollTo(0, document.documentElement.scrollHeight);
            scrollAnimId = null;
            if (onComplete) onComplete();
        }
    }
    scrollAnimId = requestAnimationFrame(step);
}

const magicBtn = document.getElementById('magicTravelBtn');
const footerEl = document.getElementById('contactFooter');

function updateMagicButtonState() {
    const footerRect = footerEl.getBoundingClientRect();
    const winH = window.innerHeight;
    const nearBottom = (footerRect.top < winH + 90) || ((winH + window.scrollY) >= document.documentElement.scrollHeight - 130);

    magicBtn.classList.toggle('is-balloon', nearBottom);
    magicBtn.title = nearBottom ? 'Torna in cima' : 'Contatti';
    magicBtn.setAttribute('aria-label', nearBottom ? 'Torna in cima' : 'Vai ai contatti');
}

magicBtn.addEventListener('click', () => {
    if (magicBtn.classList.contains('is-balloon')) {
        magicBtn.classList.add('launching');
        smoothScrollPage(true, 1850);
        setTimeout(() => magicBtn.classList.remove('launching'), 900);
    } else {
        smoothScrollPage(false, 950, updateMagicButtonState);
    }
});

window.addEventListener('scroll', updateMagicButtonState, { passive: true });

/* =========================================================
   5. LIGHTBOX FOTOGRAFICO (ALTA RISOLUZIONE + SWIPE + HISTORY)
   ========================================================= */
let currentPhotoIndex = 1;
let lbHistoryPushed = false;
let lastFocusedElement = null;

const lbModal = document.getElementById('lightboxModal');
const lbStage = document.getElementById('lightboxStage');
const lbImg = document.getElementById('lightboxImg');
const lbCloseBtn = document.getElementById('lbCloseBtn');

lbImg.addEventListener('load', () => lbImg.classList.remove('is-loading'));

function getSectionByPhoto(idx) {
    if (idx <= 18) return 1;
    if (idx <= 39) return 2;
    if (idx <= 56) return 3;
    return 4;
}

function setLightboxImage(idx) {
    const code = pad3(idx);
    lbStage.dataset.section = getSectionByPhoto(idx);
    lbImg.classList.add('is-loading');
    lbImg.src = `img/img${code}.jpg`;
    lbImg.alt = `Fotografia ${idx} — Davide Callegari`;
    if (lbImg.complete) lbImg.classList.remove('is-loading');

    const nextIdx = idx >= TOTAL_PHOTOS ? 1 : idx + 1;
    const prevIdx = idx <= 1 ? TOTAL_PHOTOS : idx - 1;
    new Image().src = `img/img${pad3(nextIdx)}.jpg`;
    new Image().src = `img/img${pad3(prevIdx)}.jpg`;
}

function openLightbox(index, fromHistory = false) {
    const wasOpen = lbModal.classList.contains('open');
    if (!wasOpen) lastFocusedElement = document.activeElement;

    currentPhotoIndex = index;
    const code = pad3(currentPhotoIndex);
    setLightboxImage(currentPhotoIndex);

    lbModal.classList.add('open');
    lbModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (!wasOpen) lbCloseBtn.focus({ preventScroll: true });

    if (!fromHistory && window.history && window.history.pushState) {
        const hashUrl = `${window.location.pathname}${window.location.search}#foto-${code}`;
        if (!wasOpen) {
            window.history.pushState({ lbOpen: true, photo: currentPhotoIndex }, '', hashUrl);
            lbHistoryPushed = true;
        } else {
            window.history.replaceState({ lbOpen: true, photo: currentPhotoIndex }, '', hashUrl);
        }
    }
}

function stepLightbox(direction) {
    const animClass = direction > 0 ? 'swipe-left' : 'swipe-right';
    lbStage.classList.add(animClass);

    setTimeout(() => {
        currentPhotoIndex += direction;
        if (currentPhotoIndex > TOTAL_PHOTOS) currentPhotoIndex = 1;
        if (currentPhotoIndex < 1) currentPhotoIndex = TOTAL_PHOTOS;
        const code = pad3(currentPhotoIndex);
        setLightboxImage(currentPhotoIndex);

        if (window.history && window.history.replaceState) {
            window.history.replaceState({ lbOpen: true, photo: currentPhotoIndex }, '', `${window.location.pathname}${window.location.search}#foto-${code}`);
        }
        lbStage.classList.remove(animClass);
    }, 120);
}

function closeLightbox(fromPopState = false) {
    if (!lbModal.classList.contains('open')) return;
    lbModal.classList.remove('open');
    lbModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (!fromPopState && lbHistoryPushed) {
        lbHistoryPushed = false;
        window.history.back();
    } else if (!fromPopState && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus({ preventScroll: true });
    }
}

lbModal.addEventListener('click', e => {
    if (e.target === lbModal) closeLightbox();
});
lbCloseBtn.addEventListener('click', () => closeLightbox());
document.getElementById('lbPrevBtn').addEventListener('click', e => { e.stopPropagation(); stepLightbox(-1); });
document.getElementById('lbNextBtn').addEventListener('click', e => { e.stopPropagation(); stepLightbox(1); });

document.getElementById('lbShareBtn').addEventListener('click', e => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}#foto-${pad3(currentPhotoIndex)}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    const toast = document.getElementById('shareToast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
});

window.addEventListener('popstate', () => {
    const match = window.location.hash.match(/^#(?:foto|img)-?0*(\d{1,3})$/i);
    if (match) {
        const photoNum = parseInt(match[1], 10);
        if (photoNum >= 1 && photoNum <= TOTAL_PHOTOS) openLightbox(photoNum, true);
    } else if (lbModal.classList.contains('open')) {
        lbHistoryPushed = false;
        closeLightbox(true);
    }
});

let touchStartX = 0;
let touchStartY = 0;

lbModal.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, { passive: true });

lbModal.addEventListener('touchend', e => {
    if (!lbModal.classList.contains('open') || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
        stepLightbox(dx < 0 ? 1 : -1);
    } else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
        closeLightbox();
    }
}, { passive: true });

window.addEventListener('keydown', e => {
    if (!lbModal.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
});

/* =========================================================
   6. GRIGLIA MASONRY CON ANTEPRIME WEBP E SUPPORTO STAMPA PDF
   ========================================================= */
const grids = document.querySelectorAll('.photo-grid');

grids.forEach(grid => {
    const start = parseInt(grid.dataset.start, 10);
    const end = parseInt(grid.dataset.end, 10);
    grid.photoElements = [];

    for (let i = start; i <= end; i++) {
        const code = pad3(i);
        const img = document.createElement('img');
        img.src = `img/webp/img${code}.webp`;
        img.onerror = function () {
            this.onerror = null;
            this.src = `img/img${code}.jpg`;
        };
        img.alt = `Fotografia ${i} — Davide Callegari`;
        img.decoding = 'async';
        img.tabIndex = 0;
        img.setAttribute('role', 'button');

        if (isPdfMode || i <= 6) {
            img.fetchPriority = 'high';
        } else {
            img.loading = 'lazy';
        }

        img.onload = () => img.classList.add('loaded');
        img.addEventListener('click', () => openLightbox(i));
        img.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(i);
            }
        });

        grid.photoElements.push(img);
        photoMap.set(i, img);
    }
});

function renderMasonryGrids(forceThreeCols = false) {
    const colCount = forceThreeCols ? 3 : (window.innerWidth <= 950 ? 2 : 3);

    grids.forEach(grid => {
        if (grid.dataset.cols == colCount) return;
        grid.dataset.cols = colCount;
        grid.innerHTML = '';

        const cols = Array.from({ length: colCount }, () => {
            const col = document.createElement('div');
            col.className = 'masonry-col';
            return col;
        });

        grid.photoElements.forEach((img, idx) => {
            if (img.complete) img.classList.add('loaded');
            cols[idx % colCount].appendChild(img);
        });

        cols.forEach(col => grid.appendChild(col));
    });
}

renderMasonryGrids(isPdfMode);

/* Apertura automatica se si arriva da un link diretto (#foto-034) */
(function checkInitialDeepLink() {
    const match = window.location.hash.match(/^#(?:foto|img)-?0*(\d{1,3})$/i);
    if (!match) return;
    const photoNum = parseInt(match[1], 10);
    if (photoNum >= 1 && photoNum <= TOTAL_PHOTOS) {
        const targetThumb = photoMap.get(photoNum);
        if (targetThumb) {
            setTimeout(() => targetThumb.scrollIntoView({ behavior: 'instant', block: 'center' }), 50);
        }
        openLightbox(photoNum, true);
    }
})();

function prepareForPrint() {
    renderMasonryGrids(true);
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.removeAttribute('loading');
        img.classList.add('loaded');
    });
}

window.addEventListener('beforeprint', prepareForPrint);

if (isPdfMode) {
    prepareForPrint();
    window.addEventListener('load', () => setTimeout(() => window.print(), 800));
}

let resizeTimer;
window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(() => renderMasonryGrids(false));
});
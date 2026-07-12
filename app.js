// ====================================================================
// INITIALIZATION CONFIGURATION PARAMETERS 
// ====================================================================
const SUPABASE_URL = "https://tvtuukholwjvqgotfjaj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pPaC5jyst8DtbNHHvz6KSw_1G757J-l";

// Safe Initialization Engine
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// State Engine Variables
let currentSessionUser = null;
let profileDataCache = null;
let enrollmentState = null;
let activeLessonContext = null;
let videoTrackerTimer = null;
let isSignUpMode = false;

document.addEventListener("DOMContentLoaded", () => {
    if (!supabase) {
        console.error("Supabase CDN framework missing!");
        return;
    }
    initAuthenticationEngine();
    registerInterfaceUIListeners();
    if (window.lucide) window.lucide.createIcons();
});

// ====================================================================
// AUTHENTICATION INFRASTRUCTURE ROUTINES
// ====================================================================
async function initAuthenticationEngine() {
    const { data: { session } } = await supabase.auth.getSession();
    evaluateSessionState(session);

    supabase.auth.onAuthStateChange((event, session) => {
        evaluateSessionState(session);
    });
}

function evaluateSessionState(session) {
    if (session) {
        currentSessionUser = session.user;
        fetchCoreUserMetadataAndSync();
    } else {
        currentSessionUser = null;
        profileDataCache = null;
        document.getElementById("app-container")?.classList.add("hidden");
        document.getElementById("auth-container")?.classList.remove("hidden");
    }
}

// ====================================================================
// INTERFACE UI LISTENERS & UTILITIES
// ====================================================================
function registerInterfaceUIListeners() {
    // ٹوگل سائن ان اور سائن اپ موڈ (New Student link fix)
    document.getElementById("auth-toggle-btn")?.addEventListener("click", (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        const submitBtn = document.getElementById("auth-submit-btn");
        if (submitBtn) submitBtn.innerText = isSignUpMode ? "Register New Account" : "Sign In to Platform";
        document.getElementById("auth-toggle-msg").innerText = isSignUpMode ? "Already a student?" : "New student?";
        document.getElementById("auth-toggle-btn").innerText = isSignUpMode ? "Sign In" : "Create Account";
    });

    // آتھینٹیکیشن سبمٹ لاجک (Sign up + Login Fix)
    document.getElementById("auth-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;
        
        if (isSignUpMode) {
            // اکاؤنٹ رجسٹریشن موڈ
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) return emitAlertNotification(error.message, "danger");
            
            if (data?.user) {
                const cleanName = email.split('@')[0];
                // ڈیٹا بیس اٹو رو انسرٹ تاکہ ایرر ختم ہو
                await supabase.from('profiles').insert([
                    { id: data.user.id, full_name: cleanName, role: 'student', current_streak: 0, total_xp: 0, longest_streak: 0 }
                ]);
                emitAlertNotification("Account created! Logging into dashboard...", "success");
                evaluateSessionState(data.session);
            }
        } else {
            // لاگ ان موڈ
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return emitAlertNotification(error.message, "danger");
            emitAlertNotification("Identity validated successfully.", "success");
        }
    });

    // لاگ آؤٹ بٹن
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        emitAlertNotification("Session terminated.", "success");
        window.location.reload();
    });

    // سائیڈ بار نیویگیشن لنکس
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            switchView(btn.getAttribute("data-target"));
        });
    });
    
    // موبائل سائیڈ بار مینو ٹوگل
    const sidebar = document.getElementById('sidebar-panel');
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle && sidebar) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('-translate-x-full');
        });
        document.body.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
        sidebar.addEventListener('click', (e) => e.stopPropagation());
    }

    // کنٹینیو لرننگ بٹن لنک
    document.getElementById("continue-learning-btn")?.addEventListener("click", () => {
        switchView('classroom-view');
    });

    // رپورٹس کلک فکس
    document.getElementById("pdf-report-btn")?.addEventListener("click", () => emitAlertNotification('Generating PDF Summary...', 'info'));
    document.getElementById("csv-report-btn")?.addEventListener("click", () => emitAlertNotification('Exporting CSV Ledger...', 'info'));

    // ایڈمن ٹیب ٹوگلنگ لنکس
    document.getElementById("tab-link-analytics")?.addEventListener("click", (e) => switchAdminTab('analytics-panel', e.target));
    document.getElementById("tab-link-lessons")?.addEventListener("click", (e) => switchAdminTab('lessons-panel', e.target));
}

function switchView(viewId) {
    document.querySelectorAll(".view-section").forEach(section => section.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("bg-brand-50", "text-brand-600", "font-semibold"));
    
    document.getElementById(viewId)?.classList.remove("hidden");
    const activeNav = document.querySelector(`[data-target="${viewId}"]`);
    if (activeNav) {
        activeNav.classList.add("bg-brand-50", "text-brand-600", "font-semibold");
    }
}

function switchAdminTab(panelId, element) {
    document.querySelectorAll('.admin-tab-content').forEach(p => p.classList.add('hidden'));
    document.getElementById(panelId)?.classList.remove('hidden');
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('border-brand-500', 'text-brand-600'));
    element.classList.add('border-brand-500', 'text-brand-600');
}

// ====================================================================
// BUSINESS DATA & DASHBOARD WORKSPACE
// ====================================================================
async function fetchCoreUserMetadataAndSync() {
    let { data: profile, error } = await supabase.from('profiles').select('*').eq('id', currentSessionUser.id).maybeSingle();
    
    if (!profile) {
        switchView('profile-view');
        document.getElementById("app-container")?.classList.remove("hidden");
        document.getElementById("auth-container")?.classList.add("hidden");
        return;
    }
    
    profileDataCache = profile;
    
    let { data: enroll } = await supabase.from('enrollments').select('*').eq('student_id', currentSessionUser.id).maybeSingle();
    if (!enroll) {
        const { data: newEnroll } = await supabase.from('enrollments').insert([{ student_id: currentSessionUser.id, current_unlocked_lesson: 1, completed_lessons_count: 0 }]).select().single();
        enrollmentState = newEnroll;
    } else {
        enrollmentState = enroll;
    }
    
    configureDynamicDashboardMetrics();
    verifyAdministrativeCapabilities();
    
    document.getElementById("auth-container")?.classList.add("hidden");
    document.getElementById("app-container")?.classList.remove("hidden");
}

function configureDynamicDashboardMetrics() {
    if (!profileDataCache) return;
    
    if(document.getElementById("sidebar-username")) document.getElementById("sidebar-username").innerText = profileDataCache.full_name || "Student";
    if(document.getElementById("sidebar-role")) document.getElementById("sidebar-role").innerText = `Student ID: ${profileDataCache.student_id || '--'}`;
    if(document.getElementById("top-streak-count")) document.getElementById("top-streak-count").innerText = profileDataCache.current_streak || 0;
    if(document.getElementById("top-xp-count")) document.getElementById("top-xp-count").innerText = profileDataCache.total_xp || 0;
    if(document.getElementById("greeting-title")) document.getElementById("greeting-title").innerText = `Assalam-o-Alaikum, ${(profileDataCache.full_name || 'Student').split(' ')[0]}!`;
    
    const completed = enrollmentState?.completed_lessons_count || 0;
    const overallProgressPct = Math.min(Math.round((completed / 47) * 100), 100);
    
    if(document.getElementById("course-progress-percent")) document.getElementById("course-progress-percent").innerText = `${overallProgressPct}%`;
    
    const ring = document.getElementById("course-progress-ring");
    if (ring) {
        const strokeDashOffset = 301.6 - (301.6 * overallProgressPct) / 100;
        ring.style.strokeDashoffset = strokeDashOffset;
    }
    
    if(document.getElementById("dashboard-lesson-headline")) {
        document.getElementById("dashboard-lesson-headline").innerText = `Next Up: Lesson Number ${enrollmentState?.current_unlocked_lesson || 1} of 47`;
    }
    
    loadClassroomLessonContext(enrollmentState?.current_unlocked_lesson || 1);
}

// ====================================================================
// CLASSROOM PLAYER STREAM ENGINE
// ====================================================================
async function loadClassroomLessonContext(lessonNumber) {
    const { data: lesson, error } = await supabase.from('lessons').select('*').eq('lesson_number', lessonNumber).maybeSingle();
    if (error || !lesson) return;
    
    activeLessonContext = lesson;
    if(document.getElementById("current-lesson-title")) document.getElementById("current-lesson-title").innerText = `Lesson ${lesson.lesson_number}: ${lesson.title}`;
    if(document.getElementById("current-lesson-desc")) document.getElementById("current-lesson-desc").innerText = lesson.description;
    
    const videoBox = document.getElementById("video-wrapper-box");
    if (videoBox) {
        videoBox.innerHTML = `<iframe id="gdrive-player" src="${lesson.video_url}" class="w-full h-full absolute inset-0 border-0" allow="autoplay; fullscreen"></iframe>`;
    }
    
    initVideoPlayerWatchProgressTracker();
    renderAssignmentInteractivePanel();
}

function initVideoPlayerWatchProgressTracker() {
    if (videoTrackerTimer) clearInterval(videoTrackerTimer);
    
    let simWatchPercentage = 0;
    videoTrackerTimer = setInterval(async () => {
        simWatchPercentage += 5; 
        if (simWatchPercentage >= 90) { 
            clearInterval(videoTrackerTimer);
            await triggerAutomaticLessonCompletionSequence();
        }
    }, 10000); 
}

async function triggerAutomaticLessonCompletionSequence() {
    if (!currentSessionUser || !activeLessonContext) return;
    
    const { error } = await supabase.from('lesson_progress').upsert({
        student_id: currentSessionUser.id,
        lesson_number: activeLessonContext.lesson_number,
        watch_percentage: 100,
        is_completed: true,
        completed_at: new Date().toISOString()
    });
    
    if(!error) {
        emitAlertNotification("Daily Lesson Complete! Progress locked.", "success");
        fetchCoreUserMetadataAndSync(); 
    }
}

function renderAssignmentInteractivePanel() {
    const container = document.getElementById("assignment-content-area");
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center space-y-3">
            <p class="text-xs font-bold text-slate-700"><strong>Deadline Threshold:</strong> 8:00 PM Tonight</p>
            <div class="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
                Complete classwork to open the grading queue.
            </div>
            <p class="text-[11px] text-slate-500">Instead of file uploads, connect with your instructor to review assignment materials directly:</p>
            <div class="flex flex-col gap-2">
                <a href="https://wa.me/923001234567" target="_blank" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all">Submit on WhatsApp</a>
                <button class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all" id="copy-hotline-btn">Copy Assignment Hotline</button>
            </div>
        </div>
    `;

    document.getElementById("copy-hotline-btn")?.addEventListener("click", () => {
        navigator.clipboard.writeText('+923001234567');
        emitAlertNotification('Copied number!', 'success');
    });
}

function verifyAdministrativeCapabilities() {
    if (profileDataCache && profileDataCache.role === 'admin') {
        document.getElementById("admin-nav-item")?.classList.remove("hidden");
    }
}

// ====================================================================
// TOAST NOTIFICATIONS UTILITY
// ====================================================================
function emitAlertNotification(message, variation = "info") {
    const box = document.getElementById("toast-container");
    if (!box) return;
    const notification = document.createElement("div");
    const bgClass = variation === "danger" ? "bg-red-600" : variation === "success" ? "bg-emerald-600" : "bg-slate-900";
    notification.className = `p-4 rounded-xl text-xs font-bold text-white shadow-lg ${bgClass} transition-all duration-300 transform translate-y-2`;
    notification.innerText = message;
    box.appendChild(notification);
    setTimeout(() => notification.remove(), 4500);
}

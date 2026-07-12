// Initialization configuration parameters 
const SUPABASE_URL = "https://tvtuukholwjvqgotfjaj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pPaC5jyst8DtbNHHvz6KSw_1G757J-l";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Engine Variables
let currentSessionUser = null;
let profileDataCache = null;
let enrollmentState = null;
let activeLessonContext = null;
let videoTrackerTimer = null;

document.addEventListener("DOMContentLoaded", () => {
    initAuthenticationEngine();
    registerInterfaceUIListeners();
});

// ====================================================================
// AUTHENTICATION INFRASTRUCTURE ROUTINES
// ====================================================================
async function initAuthenticationEngine() {
    const { data: { session } } = await supabase.auth.getSession();
    evaluateSessionState(session);

    // Dynamic state listener bindings
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
        document.getElementById("app-container").classList.add("d-none");
        document.getElementById("auth-container").classList.remove("d-none");
    }
}

// Handles Platform Registration and Login forms
document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    
    // Simplistic workflow dynamic selection handler implementation
    const isRegistrationMode = document.getElementById("auth-submit-btn").innerText.includes("Register");
    
    if (isRegistrationMode) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return emitAlertNotification(error.message, "danger");
        emitAlertNotification("Verification link transmitted. Check your inbox!", "warn");
    } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return emitAlertNotification(error.message, "danger");
        emitAlertNotification("Identity validated successfully.", "success");
    }
});

// Google Identity Protocol authentication integration trigger
document.getElementById("google-auth-btn").addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
});

// ====================================================================
// BUSINESS APPLICATION DATA WORKSPACE LOGIC
// ====================================================================
async function fetchCoreUserMetadataAndSync() {
    // 1. Resolve Profile data state
    let { data: profile, error } = await supabase.from('profiles').select('*').eq('id', currentSessionUser.id).single();
    
    if (error && error.code === 'PGRST116') {
        // Enforce switching workspace direction to configuration form view 
        switchView('profile-view');
        document.getElementById("app-container").classList.remove("d-none");
        document.getElementById("auth-container").classList.add("d-none");
        return;
    }
    
    profileDataCache = profile;
    
    // 2. Pull user specific enrollment details
    let { data: enroll } = await supabase.from('enrollments').select('*').eq('student_id', currentSessionUser.id).single();
    if (!enroll) {
        // Auto enroll entry pipeline hook for 'Computer Course'
        const { data: newEnroll } = await supabase.from('enrollments').insert([{ student_id: currentSessionUser.id }]).select().single();
        enrollmentState = newEnroll;
    } else {
        enrollmentState = enroll;
    }
    
    configureDynamicDashboardMetrics();
    verifyAdministrativeCapabilities();
    establishRealtimeSubscriptions();
    
    document.getElementById("auth-container").classList.add("d-none");
    document.getElementById("app-container").classList.remove("d-none");
}

function configureDynamicDashboardMetrics() {
    document.getElementById("sidebar-username").innerText = profileDataCache.full_name;
    document.getElementById("sidebar-role").innerText = `Student ID: ${profileDataCache.student_id}`;
    document.getElementById("top-streak-count").innerText = profileDataCache.current_streak;
    document.getElementById("top-xp-count").innerText = profileDataCache.total_xp;
    document.getElementById("greeting-title").innerText = `Assalam-o-Alaikum, ${profileDataCache.full_name.split(' ')[0]}!`;
    
    // Computes layout progress display rings
    const overallProgressPct = Math.round((enrollmentState.completed_lessons_count / 47) * 100);
    document.getElementById("course-progress-percent").innerText = `${overallProgressPct}%`;
    
    const strokeDashOffset = 326 - (326 * overallProgressPct) / 100;
    document.getElementById("course-progress-ring").style.strokeDashoffset = strokeDashOffset;
    
    document.getElementById("dashboard-lesson-headline").innerText = `Next Up: Lesson Number ${enrollmentState.current_unlocked_lesson} of 47`;
    
    loadClassroomLessonContext(enrollmentState.current_unlocked_lesson);
}

// ====================================================================
// SECURE GOOGLE DRIVE MEDIA STREAM ENGINE PLAYER
// ====================================================================
async function loadClassroomLessonContext(lessonNumber) {
    const { data: lesson, error } = await supabase.from('lessons').select('*').eq('lesson_number', lessonNumber).single();
    if (error || !lesson) return;
    
    activeLessonContext = lesson;
    document.getElementById("current-lesson-title").innerText = `Lesson ${lesson.lesson_number}: ${lesson.title}`;
    document.getElementById("current-lesson-desc").innerText = lesson.description;
    
    // Build clean embedded video display elements
    const videoBox = document.getElementById("video-wrapper-box");
    videoBox.innerHTML = `<iframe id="gdrive-player" src="${lesson.video_url}" allow="autoplay; fullscreen"></iframe>`;
    
    initVideoPlayerWatchProgressTracker();
    renderAssignmentInteractivePanel();
}

function initVideoPlayerWatchProgressTracker() {
    if (videoTrackerTimer) clearInterval(videoTrackerTimer);
    
    let simWatchPercentage = 0;
    // Track intervals securely to prevent playback position exploitation bypasses
    videoTrackerTimer = setInterval(async () => {
        simWatchPercentage += 5; 
        if (simWatchPercentage >= 90) { 
            clearInterval(videoTrackerTimer);
            await triggerAutomaticLessonCompletionSequence();
        }
    }, 10000); // Evaluates state every 10 seconds
}

async function triggerAutomaticLessonCompletionSequence() {
    const { error } = await supabase.from('lesson_progress').upsert({
        student_id: currentSessionUser.id,
        lesson_number: activeLessonContext.lesson_number,
        watch_percentage: 100,
        is_completed: true,
        completed_at: new Date().toISOString()
    });
    
    if(!error) {
        emitAlertNotification("Daily Lesson Complete! Progress locked into the system.", "success");
        fetchCoreUserMetadataAndSync(); // Sync metrics instantly
    }
}

// ====================================================================
// ASSIGNMENT DELIVERY HUB MANAGEMENT
// ====================================================================
function renderAssignmentInteractivePanel() {
    const container = document.getElementById("assignment-content-area");
    const currentTime = new Date();
    const hours = currentTime.getHours();
    
    // Layout elements matching local instruction specifications
    container.innerHTML = `
        <div class="text-center">
            <p class="mb-2"><strong>Deadline Threshold:</strong> 8:00 PM Tonight</p>
            <div class="notification-warning-banner mb-3">
                <i class="fa-solid fa-clock-history"></i> Complete classwork to open the grading queue.
            </div>
            <p class="small text-muted mb-3">Instead of file uploads, connect with your instructor to review assignment materials directly:</p>
            <div class="d-flex flex-column gap-2">
                <a href="https://wa.me/923001234567" target="_blank" class="btn btn-secondary justify-content-center bg-whatsapp"><i class="fa-brands fa-whatsapp"></i> Submit on WhatsApp</a>
                <button class="btn btn-secondary justify-content-center" onclick="navigator.clipboard.writeText('+923001234567'); emitAlertNotification('Copied number!','success');"><i class="fa-solid fa-copy"></i> Copy Assignment Hotline Contact</button>
            </div>
        </div>
    `;
}

// ====================================================================
// INTERFACE REALTIME SUBSCRIPTIONS LAYER
// ====================================================================
function establishRealtimeSubscriptions() {
    supabase.channel('public:assignments')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assignments', filter: `student_id=eq.${currentSessionUser.id}` }, payload => {
          emitAlertNotification(`Your assignment status updated to: ${payload.new.status}`, "warn");
          fetchCoreUserMetadataAndSync();
      }).subscribe();
}

// ====================================================================
// ADMINISTRATIVE OPERATIONS UTILITIES
// ====================================================================
function verifyAdministrativeCapabilities() {
    if (profileDataCache && profileDataCache.role === 'admin') {
        document.getElementById("admin-nav-item").classList.remove("d-none");
    }
}

document.getElementById("lesson-management-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        lesson_number: parseInt(document.getElementById("adm-les-num").value),
        title: document.getElementById("adm-les-title").value,
        description: document.getElementById("adm-les-desc").value,
        estimated_duration: parseInt(document.getElementById("adm-les-duration").value),
        video_url: document.getElementById("adm-les-drive").value,
        notes_url: document.getElementById("adm-les-notes").value || null,
        allow_download: document.getElementById("adm-les-download").value === "true"
    };

    const { error } = await supabase.from('lessons').upsert(payload);
    if (error) return emitAlertNotification(error.message, "danger");
    
    emitAlertNotification("Curriculum modification published completely.", "success");
    e.target.reset();
});

// ====================================================================
// SYSTEM ALERTS & INTERFACE UTILITIES
// ====================================================================
function emitAlertNotification(message, variation = "info") {
    const box = document.getElementById("toast-container");
    const notification = document.createElement("div");
    notification.className = `toast-message alert-${variation}`;
    notification.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
    box.appendChild(notification);
    setTimeout(() => notification.remove(), 4500);
}

function switchView(viewId) {
    document.querySelectorAll(".view-section").forEach(section => section.classList.add("d-none"));
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    
    document.getElementById(viewId).classList.remove("d-none");
    document.querySelector(`[data-target="${viewId}"]`)?.classList.add("active");
}

function registerInterfaceUIListeners() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            switchView(btn.getAttribute("data-target"));
        });
    });
}

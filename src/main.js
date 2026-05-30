import { SpatialEngine } from './spatial.js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://idzpjqfhahxitbapvehr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkenBqcWZoYWh4aXRiYXB2ZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzkwMzksImV4cCI6MjA5NTE1NTAzOX0.58PlO-5CkJtZx4dYUixM1kpkbMY_nnQCF1Rd3BvzNV8';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class MnemoxisApp {
    constructor() {
        this.engine = new SpatialEngine();
        this.user = null;
        this.isAdmin = false;
        
        this.checkAuth();
    }

    async checkAuth() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }

        this.user = session.user;
        this.isAdmin = (this.user.email === 'stefymaestro@gmail.com');
        
        if (this.isAdmin) {
            document.querySelector('header').insertAdjacentHTML('beforeend', 
                `<span class="text-[8px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-bold ml-4 border border-red-500/50">ADMIN PROTOCOL ACTIVE</span>`
            );
        }

        this.initZen();
        this.initVoice();
        this.bindUI();
        this.loadInitialData();
    }

    async logout() {
        await supabaseClient.auth.signOut();
        window.location.href = 'auth.html';
    }

    // --- ZEN MODE & AUDIO ENGINE ---
    initZen() {
        this.isZen = false;
        this.audioCtx = null;
        this.oscillator = null;
        
        window.toggleZen = () => {
            this.isZen = !this.isZen;
            const btn = document.getElementById('zenBtn');
            
            if (this.isZen) {
                btn.innerText = "ZEN MODE: ACTIVE";
                btn.classList.add('border-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.5)]');
                this.startAmbientAudio();
                this.engine.setZen(true);
            } else {
                btn.innerText = "ZEN MODE: OFF";
                btn.classList.remove('border-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.5)]');
                this.stopAmbientAudio();
                this.engine.setZen(false);
            }
        };
    }

    startAmbientAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Create a deep space drone using two oscillators
        this.osc1 = this.audioCtx.createOscillator();
        this.osc2 = this.audioCtx.createOscillator();
        this.gainNode = this.audioCtx.createGain();
        this.filter = this.audioCtx.createBiquadFilter();

        this.osc1.type = 'sine';
        this.osc1.frequency.setValueAtTime(55, this.audioCtx.currentTime); // Low A
        
        this.osc2.type = 'sawtooth';
        this.osc2.frequency.setValueAtTime(55.5, this.audioCtx.currentTime); // Slightly detuned

        this.filter.type = 'lowpass';
        this.filter.frequency.setValueAtTime(200, this.audioCtx.currentTime);

        this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.1, this.audioCtx.currentTime + 2);

        this.osc1.connect(this.filter);
        this.osc2.connect(this.filter);
        this.filter.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);

        this.osc1.start();
        this.osc2.start();
    }

    stopAmbientAudio() {
        if (this.gainNode) {
            this.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1);
            setTimeout(() => {
                this.osc1.stop();
                this.osc2.stop();
            }, 1000);
        }
    }

    bindUI() {
        const input = document.getElementById('taskInput');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewTask(input.value);
        });

        window.addTaskAction = () => {
            this.addNewTask(input.value);
            input.value = '';
        };

        window.toggleVoice = () => this.toggleVoice();
    }

    async addNewTask(text, priority = 'Medium') {
        if (!text) return;
        
        // --- THE "BEST" UPGRADE: Semantic Analysis ---
        let autoPriority = priority;
        const input = text.toLowerCase();
        if (input.includes('urgent') || input.includes('important') || input.includes('now')) autoPriority = 'High';
        if (input.includes('maybe') || input.includes('later')) autoPriority = 'Low';

        const task = { 
            text, 
            priority: autoPriority, 
            user_id: this.user.id,
            created_at: new Date().toISOString() 
        };
        
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([task])
            .select();

        if (error) {
            console.error("Supabase Error:", error);
            this.engine.createTaskNode(Date.now(), text, priority);
            this.updateUIList({ ...task, id: Date.now() });
            return;
        }

        if (data && data[0]) {
            const newTask = data[0];
            this.engine.createTaskNode(newTask.id, newTask.text, newTask.priority);
            this.updateUIList(newTask);
        }
    }

    updateUIList(task) {
        const list = document.getElementById('taskList');
        const item = document.createElement('div');
        item.className = 'p-3 rounded-lg bg-white/5 border border-white/5 text-xs flex items-center gap-3 hover:bg-white/10 transition-all cursor-pointer group animate-fade-in';
        item.innerHTML = `
            <div class="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style="color: ${task.priority === 'High' ? '#ff3366' : '#00d2ff'}"></div>
            <span class="flex-1 opacity-80 group-hover:opacity-100">${task.text}</span>
            <span class="text-[8px] opacity-30 italic">${new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        `;
        list.prepend(item);
    }

    async loadInitialData() {
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('user_id', this.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("Could not fetch from Supabase. Ensure 'user_id' column exists in 'tasks' table.");
            return;
        }

        if (data) {
            data.forEach(task => {
                this.engine.createTaskNode(task.id, task.text, task.priority);
                this.updateUIList(task);
            });
        }
    }

    // --- NEURAL VOICE SYNC ---
    initVoice() {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn("Speech recognition not supported");
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            console.log("Heard:", transcript);
            
            if (transcript.toLowerCase().includes("add") || transcript.length > 5) {
                this.addNewTask(transcript);
                this.showVisualFeedback("STAR GENERATED FROM VOICE");
            }
        };

        this.recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('listening-indicator').style.display = 'block';
        };

        this.recognition.onend = () => {
            if (this.isListening) this.recognition.start();
        };
    }

    toggleVoice() {
        if (this.isListening) {
            this.isListening = false;
            this.recognition.stop();
            document.getElementById('listening-indicator').style.display = 'none';
        } else {
            this.recognition.start();
        }
    }

    showVisualFeedback(msg) {
        const fb = document.createElement('div');
        fb.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-future text-xl tracking-[10px] pointer-events-none animate-ping z-[3000]';
        fb.innerText = msg;
        document.body.appendChild(fb);
        setTimeout(() => fb.remove(), 2000);
    }
}


// Start the app
window.addEventListener('DOMContentLoaded', () => {
    window.App = new MnemoxisApp();
});
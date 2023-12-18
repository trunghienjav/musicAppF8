/**Tính năng
1. Render songs
2. Scroll tio
3. Play/ Pause / seek
4. CD rotate
5. Next / prev
6. Random
7. Next / Repeat when ended
8. Active song
9. Scroll active song to view
10. Play song when click
**/
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const PLAYER_STORAGE_KEY = 'F8_PLAYER';

const heading = $('header h2');
const cdThumb = $('.cd-thumb');
const audio = $('#audio');
const cd = $('.cd');
const playBtn = $('.btn-toggle-play');
const player = $('.player');
const progress = $('.progress');
const nextBtn = $('.btn-next');
const prevBtn = $('.btn-prev');
const repeatBtn = $('.btn-repeat');
const randomBtn = $('.btn-random');
const playlist = $('.playlist');
const playedSong = [];

const spotifyAPI = {
    clientId: '0ad9eaecc2664dd9b6d5add62b91f045',
    clientSecret: '7730bd28f3e94702b2814ef39617ab16',
    token: '',

    async getToken() {
        const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        const data = await response.json();
        this.token = data.access_token;
    },
    async getPlaylist(playlistId) {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });

        const data = await response.json();
        return data;
    },
};

const app = {
    currentIndex: 0,
    isPlaying: false,
    isRandom: false,
    isRepeat: false,
    config: JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)) || {},
    songs: [],

    setConfig: function (key, value) {
        this.config[key] = value;
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config))
    },
    render: function () {
        const htmls = this.songs.map((song, index) => { //this này chính là thèn app
            return `
                    <div class="song ${index === this.currentIndex ? 'active' : ''}" data-index="${index}">
                        <div class="thumb" style="background-image: url('${song.image}');">
                        </div>
                        <div class="body">
                            <h3 class="title">${song.name}</h3>
                            <p class="author">${song.singer}</p>
                        </div>
                        <div class="option">
                            <i class="fas fa-ellipsis-h"></i>
                        </div>
                    </div>
                    `
        })
        playlist.innerHTML = htmls.join('');
    },

    defineProperties: function () { //hàm này để lấy ra bài hét hiện tại
        Object.defineProperty(this, 'currentSong', { //define cho chính cái object này luôn nên dùng this, hàm define dùng ntn thì tra w3s, vào console gõ app.currentSong thì sẽ thấy nó hiện ra đối tượng current song
            get: function () {
                return this.songs[this.currentIndex];
            }
        })
    },

    handleEvents: function () {
        const _this = this; //194, 29:17, đặt cái this này cho nó khỏi nhầm với cái this của thèn playBtn.onclick được dùng phía dưới
        const cdWidth = cd.offsetWidth; //lấy ra chiều dọc ? của cái class cd

        const cdThumbAnimate = cdThumb.animate([ //đoạn này cop code thôi, xử lí quay vòng tròn đĩa cd
            { transform: 'rotate(360deg)' }
        ], {
            duration: 10000,
            iterations: Infinity
        });
        cdThumbAnimate.pause();

        //xử lí phóng to, thu nhỏ đĩa cd
        document.onscroll = function () {
            const scrollTop = window.scrollY || document.documentElement.scrollTop; //kéo lên bao nhiêu
            const newCdWidth = cdWidth - scrollTop;

            cd.style.width = newCdWidth > 0 ? newCdWidth + 'px' : 0;
            cd.style.opacity = newCdWidth / cdWidth;
        }

        //xử lí khi ấn play
        playBtn.onclick = function () {
            if (_this.isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }; //_this này là thèn app, nếu dùng this bình thường thì nó sẽ hiểu là this của thèn playBtn

            // Khi tiến độ bài hét thay đổi (làm cho thanh thời lượng chạy)
            audio.ontimeupdate = _this.updateProgress;
        }

        //nhảy nhạc tới chỗ muốn tua
        progress.oninput = function (e) {
            // console.log((e.target.value * audio.duration) / 100);
            const seekTime = (e.target.value * audio.duration) / 100;//value ở đây chính là % của thanh progress, seekTime là mình tính currentTime
            audio.currentTime = seekTime;
        }

        //handle next song
        nextBtn.onclick = function () {
            if (_this.isRandom) {

                _this.playRandomSong();
            } else {
                _this.nextSong();
            }
            _this.getNewActiveSong();
            if (_this.currentIndex == 0) {
                _this.scrollToActiveSong();
            }
            audio.ontimeupdate = _this.updateProgress;
            audio.play();
        }

        //handle previous song
        prevBtn.onclick = function () {
            if (_this.isRandom) {
                _this.playRandomSong();
            } else {
                _this.previousSong();
            }
            _this.getNewActiveSong();
            if (_this.currentIndex == _this.songs.length - 1) {
                _this.scrollToActiveSong();
            }
            audio.ontimeupdate = _this.updateProgress;
            audio.play();
        }
        audio.onplay = function () {
            _this.isPlaying = true;
            player.classList.add('playing'); //dùng classList thì thẻ class player sẽ thêm dc thêm playing vào
            cdThumbAnimate.play();
            audio.ontimeupdate = _this.updateProgress;
        }

        audio.onpause = function () { //bắt sự kiện của audio.pause()
            _this.isPlaying = false;
            player.classList.remove('playing');
            cdThumbAnimate.pause();
        }

        // bật/ tắt nút random
        randomBtn.onclick = function () {
            _this.isRandom = !_this.isRandom
            _this.setConfig('isRandom', _this.isRandom)
            randomBtn.classList.toggle('active', _this.isRandom) //ấn phát nữa thì isRandom đã tồn tại nên nó xóa cái active đi?
        }

        //Xử lí bật/ tắt nút lặp lại song
        repeatBtn.onclick = function () {
            _this.isRepeat = !_this.isRepeat
            _this.setConfig('isRepeat', _this.isRepeat)
            repeatBtn.classList.toggle('active', _this.isRepeat)
        }

        //xử lí khi ended
        audio.onended = function () {
            if (_this.isRepeat) {
                audio.play();
            } else {
                nextBtn.click(); //hiểu là khi ended thì nó sẽ tự click next bài
            }
        }

        //Lắng nghe hành vi click vào playlist
        playlist.onclick = function (e) {
            // if (e.target.closest('.song:not(.active)') || e.target.closest('.option')) {
            //     console.log(e.target);
            // }
            const songNode = e.target.closest('.song:not(.active)');  //closest() trả về chính nó hoặc thẻ cha của nó, nếu ko có sẽ trả về null
            if (songNode) {
                _this.currentIndex = Number(songNode.getAttribute('data-index')); //hoặc nâng cao có thể ghi là songNode.dataset.index, buổi 194, 1:38:14
                _this.getNewActiveSong();
                _this.loadCurrentSong();
                audio.play();
            }
            //Xử lí nút 3 chấm
            if (e.target.closest('.option')) {

            }
        }
    },

    updateProgress: function () {
        if (!isNaN(audio.duration) && isFinite(audio.duration)) {
            // Bạn có thể sử dụng audio.duration mà không gặp lỗi (lỗi thanh progress chạy về giữa do bị NaN)
            const progressPercent = Math.floor((audio.currentTime / audio.duration) * 100);
            progress.value = progressPercent;
            // console.log('Thời lượng: ' + progressPercent + '%');
        }
    },

    loadCurrentSong: function () {
        heading.textContent = this.currentSong.name;
        cdThumb.style.backgroundImage = `url('${this.currentSong.image}')`;
        audio.src = this.currentSong.path;
        // console.log(heading, cdThumb, audio);
    },

    loadConfig: function () {
        this.isRandom = this.config.isRandom;
        this.isRepeat = this.config.isRepeat;
    },

    nextSong: function () {
        this.currentIndex++;
        if (this.currentIndex >= this.songs.length) {
            this.currentIndex = 0;
        }
        this.loadCurrentSong(); //cần chạy lại hàm này
    },

    previousSong: function () {
        this.currentIndex--;
        if (this.currentIndex < 0) {
            this.currentIndex = this.songs.length - 1;
        }
        this.loadCurrentSong();
    },

    playRandomSong: function () {
        let newIndex
        //nếu mảng đã đầy thì sẽ xóa
        if (playedSong.length >= this.songs.length) {
            playedSong.splice(0, playedSong.length);
        }
        //không được lặp trùng chính nó
        do {
            newIndex = Math.floor(Math.random() * this.songs.length)
        } while (newIndex === this.currentIndex || playedSong.includes(newIndex))
        // console.log(newIndex);
        this.currentIndex = newIndex;

        if (!playedSong.includes(this.currentIndex)) {
            playedSong.push(this.currentIndex);
            console.log(playedSong);
        }
        this.loadCurrentSong();
        this.scrollToActiveSong();

    },

    scrollToActiveSong: function () {
        setTimeout(() => {
            $('.song.active').scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            })
        }, 300)
    },

    getNewActiveSong: function () {
        $('.song.active').classList.remove('active');
        const newActiveSong = $('.song[data-index="' + this.currentIndex + '"]') //lấy cái song mới, gợi ý từ chat GPT
        newActiveSong.classList.add('active');
    },

    start: async function () {
        // Gán cấu hình từ config vào app
        this.loadConfig(); //đọc từ local storage ra, lưu vào config, gọi hàm loadConfig, lưu giá trị isRandom và isRepeat 

        // Định nghĩa các thuộc tính cho Object
        this.defineProperties();

        // Lắng nghe / xủ lí các sự kiện (Dom event)
        this.handleEvents();

        //
        // this.loadCurrentSong();

        randomBtn.classList.toggle('active', this.isRandom)//nếu ko gọi lại thì button ko hiện màu lên
        repeatBtn.classList.toggle('active', this.isRepeat)

        // Gọi hàm để lấy token khi ứng dụng khởi chạy
        await spotifyAPI.getToken();

        // Lấy thông tin playlist
        const playlistId = '6I2d5Lj1FAKX3w2dLPvvOl';
        const playlistData = await spotifyAPI.getPlaylist(playlistId);
        console.log(playlistData);

        // Chuyển đổi dữ liệu từ Spotify thành định dạng của ứng dụng
        const formattedSongs = playlistData.items.map(item => {
            return {
                name: item.track.name,
                singer: item.track.artists.map(artist => artist.name).join(', '),
                path: item.track.preview_url,
                image: item.track.album.images[0].url
            };
        });

        // const trackData = await spotifyAPI.getTrack(item.track.id);
        // console.log(trackData);
        // Gán dữ liệu vào biến app.songs
        // console.log(formattedSongs);
        this.songs = formattedSongs;

        this.loadCurrentSong();

        // Render playlist
        this.render();
    }
}
// console.log(app.songs);
app.start();

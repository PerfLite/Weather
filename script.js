// Конвертация координат в название города (обратный геокодинг)
async function getCityName(lat, lon) {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        // Open-Meteo не возвращает название города напрямую, поэтому используем отдельный API
        const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        );
        const data = await geoResponse.json();
        return data.address?.city || data.address?.town || data.address?.village || "Неизвестно";
    } catch (error) {
        console.error("Ошибка получения города:", error);
        return "Город не определён";
    }
}

// Основная функция получения погоды по координатам
async function getWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.current_weather) {
            throw new Error("Нет данных о погоде");
        }
        
        const temp = Math.round(data.current_weather.temperature);
        const wind = Math.round(data.current_weather.windspeed);
        const weatherCode = data.current_weather.weathercode;
        
        // Получаем влажность из почасовых данных (первый час)
        let humidity = "—";
        if (data.hourly && data.hourly.relativehumidity_2m && data.hourly.relativehumidity_2m[0]) {
            humidity = data.hourly.relativehumidity_2m[0];
        }
        
        // Описание погоды по коду
        const weatherDesc = getWeatherDescription(weatherCode);
        
        // Получаем название города
        const cityName = await getCityName(lat, lon);
        
        // Обновляем интерфейс
        document.getElementById("cityName").textContent = cityName;
        document.getElementById("temperature").textContent = `${temp}°C`;
        document.getElementById("description").textContent = weatherDesc;
        document.getElementById("humidity").textContent = humidity;
        document.getElementById("windSpeed").textContent = wind;
        
        // Меняем фон в зависимости от температуры
        changeBackground(temp);
        
    } catch (error) {
        console.error("Ошибка:", error);
        document.getElementById("cityName").textContent = "Ошибка";
        document.getElementById("temperature").textContent = "--°C";
        document.getElementById("description").textContent = "Не удалось загрузить погоду";
    }
}

// Описание погоды по коду WMO
function getWeatherDescription(code) {
    const codes = {
        0: "☀️ Ясно",
        1: "🌤️ В основном ясно",
        2: "⛅ Переменная облачность",
        3: "☁️ Пасмурно",
        45: "🌫️ Туман",
        51: "🌧️ Легкая морось",
        61: "🌧️ Дождь",
        71: "❄️ Снегопад",
        80: "💦 Ливень"
    };
    return codes[code] || "🌥️ Облачно";
}

// Меняем фон в зависимости от температуры
function changeBackground(temp) {
    const body = document.body;
    if (temp < 0) {
        body.style.background = "linear-gradient(135deg, #0f2027, #203a43, #2c5364)";
    } else if (temp < 10) {
        body.style.background = "linear-gradient(135deg, #1e3c72, #2a5298)";
    } else if (temp < 20) {
        body.style.background = "linear-gradient(135deg, #2193b0, #6dd5ed)";
    } else if (temp < 30) {
        body.style.background = "linear-gradient(135deg, #f2994a, #f2c94c)";
    } else {
        body.style.background = "linear-gradient(135deg, #e44d26, #f16529)";
    }
}

// Получение координат по названию города (геокодинг)
async function getCityCoordinates(cityName) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const city = data.results[0];
            return { lat: city.latitude, lon: city.longitude, name: city.name };
        } else {
            throw new Error("Город не найден");
        }
    } catch (error) {
        console.error("Ошибка геокодинга:", error);
        return null;
    }
}

// Обработчик кнопки поиска
document.getElementById("searchBtn").addEventListener("click", async () => {
    const cityInput = document.getElementById("cityInput").value.trim();
    if (!cityInput) return;
    
    // Показываем загрузку
    document.getElementById("cityName").textContent = "Загрузка...";
    document.getElementById("temperature").textContent = "--°C";
    
    const coords = await getCityCoordinates(cityInput);
    if (coords) {
        document.getElementById("cityInput").value = coords.name; // подставляем правильное название
        await getWeather(coords.lat, coords.lon);
    } else {
        document.getElementById("cityName").textContent = "Город не найден";
        document.getElementById("temperature").textContent = "--°C";
    }
});

// При загрузке страницы — погода в Москве (координаты по умолчанию)
window.addEventListener("load", async () => {
    const defaultCoords = await getCityCoordinates("Москва");
    if (defaultCoords) {
        await getWeather(defaultCoords.lat, defaultCoords.lon);
    } else {
        // Запасной вариант: координаты Кремля
        await getWeather(55.7558, 37.6176);
        document.getElementById("cityName").textContent = "Москва";
    }
});
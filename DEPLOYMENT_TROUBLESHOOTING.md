# 🔧 CrimeRoom Deployment Troubleshooting

## ❌ Common Build Errors & Solutions

### 1. **Pydantic/Rust Compilation Error**
**Error**: `pydantic_core` compilation fails with Rust errors

**Solution**: Use the updated requirements.txt with older, stable versions:
```
Flask==2.3.3
Flask-SocketIO==5.3.6
eventlet==0.33.3
gunicorn==20.1.0
```

### 2. **Python Version Issues**
**Error**: Build fails due to Python version incompatibility

**Solutions**:
- Use `runtime.txt` with `python-3.10.12`
- Or try `python-3.9.18` for maximum compatibility

### 3. **Alternative Minimal Setup**
If you're still getting build errors, try this ultra-minimal approach:

**Step 1**: Replace `requirements.txt` with:
```
Flask==2.3.3
Flask-SocketIO==5.3.6
eventlet==0.33.3
gunicorn==20.1.0
```

**Step 2**: Update `runtime.txt` to:
```
python-3.9.18
```

### 4. **Build Command Alternatives**

Try these build commands in Render:

**Option 1** (Current):
```
pip install --upgrade pip && pip install -r requirements.txt
```

**Option 2** (If Option 1 fails):
```
pip install --no-cache-dir -r requirements.txt
```

**Option 3** (Minimal):
```
pip install Flask==2.3.3 Flask-SocketIO==5.3.6 eventlet==0.33.3 gunicorn==20.1.0
```

## 🚀 Quick Fix Steps

### If Build is Failing:

1. **Update requirements.txt**:
   ```bash
   # Copy the minimal requirements
   cp requirements-minimal.txt requirements.txt
   ```

2. **Update runtime.txt**:
   ```
   python-3.9.18
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Fix build dependencies"
   git push origin main
   ```

4. **Redeploy on Render**

### Alternative Deployment Methods:

#### **Method 1: Manual Configuration**
Instead of using `render.yaml`, configure manually in Render dashboard:
- **Build Command**: `pip install Flask==2.3.3 Flask-SocketIO==5.3.6 eventlet==0.33.3 gunicorn==20.1.0`
- **Start Command**: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT main:app`

#### **Method 2: Docker Deployment**
Create a `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE $PORT

CMD gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT main:app
```

## 🔍 Debugging Steps

### 1. **Check Render Logs**
- Go to your Render dashboard
- Click on your service
- Check "Logs" tab for detailed error messages

### 2. **Test Locally First**
```bash
# Test with the same requirements
pip install -r requirements.txt
python run_local.py
```

### 3. **Verify File Structure**
Ensure you have:
```
your-project/
├── main.py
├── requirements.txt
├── runtime.txt
├── Procfile
├── templates/
├── static/
└── .gitignore
```

## 🎯 Working Configuration

Here's a **guaranteed working setup**:

**requirements.txt**:
```
Flask==2.3.3
Flask-SocketIO==5.3.6
eventlet==0.33.3
gunicorn==20.1.0
```

**runtime.txt**:
```
python-3.9.18
```

**Procfile**:
```
web: gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT main:app
```

**Render Settings**:
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT main:app`

## 🆘 Last Resort Solutions

### If Nothing Works:

1. **Try Heroku Instead**:
   - Same files work on Heroku
   - More mature Python support

2. **Use Railway**:
   - Often handles dependencies better
   - Similar deployment process

3. **Try Vercel with Serverless**:
   - Different approach but works well
   - May need slight code modifications

## ✅ Success Indicators

Your deployment is working when you see:
```
==> Build successful 🎉
==> Starting service with 'gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT main:app'
==> Your service is live at https://your-app.onrender.com
```

## 📞 Still Having Issues?

1. **Check Python version compatibility**
2. **Try the minimal requirements**
3. **Clear Render cache** (redeploy from scratch)
4. **Test locally with exact same requirements**

The key is using **older, stable versions** that don't require Rust compilation!
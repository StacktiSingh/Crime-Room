from flask import Flask, render_template, request, redirect, url_for, session
from flask_socketio import SocketIO, join_room, emit
import random, string, os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'secret123')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=False, engineio_logger=False)

def generate_room_code(length=5):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@app.route('/', methods=['GET', 'POST'])
def username():
    if request.method == 'POST':
        session['username'] = request.form['username']
        return redirect(url_for('home'))
    return render_template('username.html')

@app.route('/home', methods=['GET', 'POST'])
def home():
    session.pop('room', None)  # or session.clear() if needed
    return render_template('home.html')

@app.route('/create')
def create_room():
    room_code = generate_room_code()
    return redirect(url_for('chat', room_code=room_code))

@app.route('/join', methods=['POST'])
def join_room_redirect():
    code = request.form['room_code'].upper()
    return redirect(url_for('chat', room_code=code))

@app.route('/chat/<room_code>')
def chat(room_code):
    username = session.get('username')
    if not username:
        return redirect('/')
    return render_template('chat.html', username=username, room_code=room_code)

@socketio.on('message')
def handle_message(data):
    emit('message', data, to=data['room'])

@socketio.on('join')
def handle_join(data):
    username = data.get('username')
    room = data.get('room')
    join_room(room)
    emit('message', {'msg': f"{username} has joined the room."}, to=room)

@socketio.on('leave')
def handle_leave(data):
    username = data['username']
    room = data['room']
    emit('message', {'msg': f"{username} has exited the room."}, to=room)

# WebRTC signaling events
@socketio.on('start-call')
def handle_start_call(data):
    room = data['room']
    from_user = data['from']
    caller_socket = request.sid
    # Directly show incoming call to other users in the room
    emit('incoming-call', {
        'from': from_user,
        'callerSocket': caller_socket
    }, to=room, include_self=False)

@socketio.on('send-offer')
def handle_send_offer(data):
    to_socket = data['to']
    offer = data['offer']
    from_socket = request.sid
    emit('incoming-offer', {
        'from': session.get('username', 'Unknown'),
        'offer': offer,
        'socketId': from_socket
    }, to=to_socket)

@socketio.on('send-answer')
def handle_send_answer(data):
    to_socket = data['to']
    answer = data['answer']
    emit('receive-answer', {'answer': answer}, to=to_socket)

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    to_socket = data['to']
    candidate = data['candidate']
    emit('ice-candidate', {'candidate': candidate}, to=to_socket)

@socketio.on('call-accepted')
def handle_call_accepted(data):
    to_socket = data['to']
    from_user = data['from']
    accepter_socket = request.sid
    emit('call-accepted', {'from': from_user, 'accepterSocket': accepter_socket}, to=to_socket)

@socketio.on('call-rejected')
def handle_call_rejected(data):
    to_socket = data['to']
    emit('call-rejected', {'from': session.get('username', 'Unknown')}, to=to_socket)

@socketio.on('end-call')
def handle_end_call(data):
    room = data.get('room')
    emit('call-ended', {'from': session.get('username', 'Unknown')}, to=room, include_self=False)



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
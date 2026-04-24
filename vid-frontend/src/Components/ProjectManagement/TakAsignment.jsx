import React, { useState } from "react";

const TaskAssignments = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Storyboard creation", assignedTo: "John", status: "Done" },
    { id: 2, title: "Footage selection", assignedTo: "Sarah", status: "In Progress" },
    { id: 3, title: "Audio mixing", assignedTo: "Mike", status: "To Do" },
  ]);

  const [newTask, setNewTask] = useState({ title: "", assignedTo: "" });

  const addTask = () => {
    if (newTask.title && newTask.assignedTo) {
      setTasks([
        ...tasks,
        {
          id: tasks.length + 1,
          ...newTask,
          status: "To Do",
        },
      ]);
      setNewTask({ title: "", assignedTo: "" });
    }
  };

  const updateTaskStatus = (id, status) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  return (
    <div className="task-assignments">
      <h2>Tasks</h2>
      <div className="task-list">
        {tasks.map((task) => (
          <div key={task.id} className="task-item">
            <h3>{task.title}</h3>
            <p>Assigned to: {task.assignedTo}</p>
            <select
              value={task.status}
              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        ))}
      </div>
      <div className="add-task">
        <input
          type="text"
          placeholder="Task Title"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
        />
        <input
          type="text"
          placeholder="Assigned To"
          value={newTask.assignedTo}
          onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
        />
        <button onClick={addTask}>Add Task</button>
      </div>
    </div>
  );
};

export default TaskAssignments;

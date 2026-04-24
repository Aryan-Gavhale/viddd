import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, CheckCircle, PlayCircle, PauseCircle, RotateCcw, Flag, Paperclip } from 'lucide-react';

const ReviewPage = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timelineComments, setTimelineComments] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revisionRequested, setRevisionRequested] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const tags = ['Professional', 'Creative', 'On Time', 'Excellent Communication', 'Exceeded Expectations', 'Needs Improvement', 'Good Use of Effects', 'Clear Audio', 'Smooth Transitions'];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the review data to your backend
    console.log({ rating, feedback, selectedTags, timelineComments, revisionRequested, attachments });
    setIsSubmitted(true);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addTimelineComment = () => {
    setTimelineComments([...timelineComments, { time: currentTime, comment: '' }]);
  };

  const updateTimelineComment = (index, comment) => {
    const updatedComments = [...timelineComments];
    updatedComments[index].comment = comment;
    setTimelineComments(updatedComments);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Review the Edited Video</h1>
          
          {/* Video Player */}
          <div className="aspect-w-16 aspect-h-9 mb-8 bg-gray-200 rounded-lg relative">
            <video src="https://www.youtube.com/watch?v=es4x5R-rV9s"></video>
            <div className="flex items-center justify-center text-gray-500">
              Video Player Placeholder
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <button onClick={() => setIsPlaying(!isPlaying)} className="text-white">
                {isPlaying ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={currentTime} 
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                className="w-full mx-4"
              />
              <span className="text-white text-sm">{formatTime(currentTime)}</span>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Review Progress</span>
              <span className="text-sm font-medium text-gray-700">75%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Rate the Video</h2>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(star)}
                  className={`text-3xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  <Star fill={rating >= star ? 'currentColor' : 'none'} />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Feedback</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <motion.button
                  key={tag}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Timeline Comments */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Timeline Comments</h2>
            <button 
              onClick={addTimelineComment}
              className="mb-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-200"
            >
              Add Comment
            </button>
            {timelineComments.map((comment, index) => (
              <div key={index} className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 w-20">{formatTime(comment.time)}</span>
                <input
                  type="text"
                  value={comment.comment}
                  onChange={(e) => updateTimelineComment(index, e.target.value)}
                  className="flex-grow px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter your comment..."
                />
              </div>
            ))}
          </div>

          {/* Feedback Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Feedback
              </label>
              <textarea
                id="feedback"
                rows={4}
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Share your thoughts on the edited video..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              ></textarea>
            </div>

            {/* Revision Request */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={revisionRequested}
                  onChange={() => setRevisionRequested(!revisionRequested)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2 text-gray-700">Request Revision</span>
              </label>
            </div>

            {/* File Attachments */}
            <div className="mb-6">
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Attach Files (Screenshots, References, etc.)
              </label>
              <div className="flex items-center">
                <label htmlFor="file-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Paperclip className="h-5 w-5 inline-block mr-1" />
                  Choose files
                </label>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <span className="ml-3 text-sm text-gray-500">
                  {attachments.length} file(s) selected
                </span>
              </div>
              {attachments.length > 0 && (
                <ul className="mt-2 text-sm text-gray-500">
                  {attachments.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
            >
              Submit Review
              <Send className="ml-2 h-5 w-5" />
            </motion.button>
          </form>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {isSubmitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md w-full mx-4"
          >
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">Your review has been submitted successfully. We appreciate your feedback!</p>
            <button
              onClick={() => setIsSubmitted(false)}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default ReviewPage;


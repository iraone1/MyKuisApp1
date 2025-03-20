import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { database } from '../firebaseConfig';
import { get, ref } from 'firebase/database';

const QuizScreen = ({ navigation, route }) => {
  const category = route?.params?.category;
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    if (!category) {
      console.error('Category tidak ditemukan!');
      return;
    }

    const fetchQuestions = async () => {
      try {
        const snapshot = await get(ref(database, `questions/${category}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          let formattedQuestions = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));

          // Mengacak pertanyaan menggunakan Fisher-Yates shuffle
          formattedQuestions = formattedQuestions.sort(() => Math.random() - 0.5);

          setQuestions(formattedQuestions);
          setIsActive(true); // Start the timer when questions are loaded
        } else {
          console.warn('Tidak ada pertanyaan untuk kategori ini.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchQuestions();
  }, [category]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    
    if (isActive) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else if (!isActive && timer !== 0) {
      clearInterval(interval);
    }
    
    return () => clearInterval(interval);
  }, [isActive, timer]);

  // Format time for display (mm:ss)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (option) => {
    setSelectedOption(option);
    
    // Add a slight delay to show the selected option before moving to the next question
    setTimeout(() => {
      const isCorrect = option === questions[currentQuestion]?.answer;
      const newScore = score + (isCorrect ? 1 : 0);

      if (currentQuestion < questions.length - 1) {
        setScore(newScore);
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null); // Reset selected option
      } else {
        setIsActive(false); // Stop the timer when quiz is complete
        navigation.replace('Result', { 
          score: newScore, 
          totalQuestions: questions.length, 
          category,
          timeSpent: timer // Pass the total time spent to the result screen
        });
      }
    }, 300);
  };

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Memuat pertanyaan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get current question options
  const options = questions[currentQuestion]?.options || [];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerText}>Soal {currentQuestion + 1}</Text>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
      </View>
      
      <View style={styles.questionBox}>
        {/* Centered question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{questions[currentQuestion]?.question}</Text>
        </View>
        
        {/* Answers section below */}
        <View style={styles.answersSection}>
          <Text style={styles.answerTitle}>Jawaban</Text>
          
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedOption === option && styles.selectedOption
                ]}
                onPress={() => handleAnswer(option)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionLabel}>
                  {index === 0 ? 'A' : index === 1 ? 'B' : index === 2 ? 'C' : 'D'}
                </Text>
                <Text style={styles.optionButtonText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#202020', 
    padding: 0
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#444',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#dcc91f',
  },
  header: {
    padding: 16,
    marginBottom: 10,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'black',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#dcc91f',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'black',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#dcc91f',
  },
  questionBox: {
    flex: 1,
    backgroundColor: 'black',
    width: '92%',
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#dcc91f',
    padding: 16,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  questionContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 26,
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
  },
  answersSection: {
    flex: 0.6,
    marginTop: 20,
  },
  answerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    marginBottom: 16,
  },
  optionsContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  optionButton: { 
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#dcc91f',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 3,
    marginBottom: 10,
    minHeight: 50,
  },
  selectedOption: {
    backgroundColor: '#665e11',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  optionLabel: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#dcc91f',
    top: 11,
    left: 8,
    backgroundColor: 'black',
    color: 'white',
    fontWeight: 'bold',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  optionButtonText: { 
    color: '#fff', 
    fontSize: 16,
    textAlign: 'center',
    marginLeft: 30,
    width: '85%',
  },
});

export default QuizScreen;
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, addDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Contexto para compartir el estado de Firebase, el usuario y las notificaciones
const AppContext = createContext();

// Componente para mostrar notificaciones en la parte superior derecha de la pantalla
const NotificationCenter = () => {
  const { notifications, dismissNotification } = useContext(AppContext);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center justify-between p-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform scale-100 opacity-100
            ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            ${!notification.type ? 'bg-gray-700 text-white' : ''}
          `}
          style={{ minWidth: '250px' }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => dismissNotification(notification.id)}
            className="ml-4 text-white hover:text-gray-200 focus:outline-none"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

// Hook para cargar ubicaciones (invernaderos)
const useLocations = () => {
  const { db, isAuthReady, addNotification } = useContext(AppContext);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const locationsColRef = collection(db, `artifacts/${appId}/public/data/locations`);
      const q = query(locationsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const locationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocations(locationsData);
      }, (error) => {
        console.error("Error al obtener ubicaciones:", error);
        addNotification("Error al cargar ubicaciones.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  return locations;
};

// Componente para la gestión de ubicaciones (invernaderos) - MOVIDO AQUÍ
const LocationCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [locations, setLocations] = useState([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editingLocationName, setEditingLocationName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const locationsColRef = collection(db, `artifacts/${appId}/public/data/locations`);
      const q = query(locationsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const locsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocations(locsData);
      }, (error) => {
        console.error("Error al obtener el catálogo de ubicaciones:", error);
        addNotification("Error al cargar ubicaciones.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocationName.trim()) {
      addNotification("El nombre de la ubicación no puede estar vacío.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/locations`), {
        name: newLocationName.trim(),
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Ubicación añadida exitosamente.", "success");
      setNewLocationName('');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir ubicación:", error);
      addNotification("Error al añadir ubicación.", "error");
    }
  };

  const handleEditLocation = (locationId, currentName) => {
    setEditingLocationId(locationId);
    setEditingLocationName(currentName);
  };

  const handleSaveLocation = async (locationId) => {
    if (!editingLocationName.trim()) {
      addNotification("El nombre de la ubicación no puede estar vacío.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const locationDocRef = doc(db, `artifacts/${appId}/public/data/locations`, locationId);
      await updateDoc(locationDocRef, {
        name: editingLocationName.trim(),
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Ubicación actualizada exitosamente.", "success");
      setEditingLocationId(null);
      setEditingLocationName('');
    } catch (error) {
      console.error("Error al actualizar ubicación:", error);
      addNotification("Error al actualizar ubicación.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingLocationId(null);
    setEditingLocationName('');
  };

  const handleArchiveLocation = async (locationId) => {
    if (!window.confirm("¿Estás seguro de que quieres archivar esta ubicación?")) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const locationDocRef = doc(db, `artifacts/${appId}/public/data/locations`, locationId);
      await updateDoc(locationDocRef, {
        isActive: false,
        archivedAt: new Date(),
        archivedBy: userId
      });
      addNotification("Ubicación archivada exitosamente.", "success");
    } catch (error) {
      console.error("Error al archivar ubicación:", error);
      addNotification("Error al archivar ubicación.", "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Gestión de Ubicaciones</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nueva Ubicación
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddLocation} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Nueva Ubicación</h3>
          <div className="mb-4">
            <label htmlFor="newLocationName" className="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
            <input
              type="text"
              id="newLocationName"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Ubicación
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-gray-700 mb-4">Ubicaciones Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-green-100 border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan="2" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No hay ubicaciones registradas.
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-50">
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingLocationId === loc.id ? (
                      <input
                        type="text"
                        value={editingLocationName}
                        onChange={(e) => setEditingLocationName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap">{loc.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingLocationId === loc.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveLocation(loc.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditLocation(loc.id, loc.name)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveLocation(loc.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// Componente para la gestión de catálogo de insumos
const InputCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [inputs, setInputs] = useState([]);
  const [newInputName, setNewInputName] = useState('');
  const [newInputUnit, setNewInputUnit] = useState('');
  const [newInputPrice, setNewInputPrice] = useState('');
  const [newInputActiveComponents, setNewInputActiveComponents] = useState([{ name: '', percentage: '' }]);
  const [editingInputId, setEditingInputId] = useState(null);
  const [editingInputPrice, setEditingInputPrice] = useState('');
  const [editingInputActiveComponents, setEditingInputActiveComponents] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const inputsColRef = collection(db, `artifacts/${appId}/public/data/input_catalog`);
      const q = query(inputsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const inputsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInputs(inputsData);
      }, (error) => {
        console.error("Error al obtener el catálogo de insumos:", error);
        addNotification("Error al cargar insumos.", "error");
      });

      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleNewActiveComponentChange = (index, e) => {
    const { name, value } = e.target;
    const updatedComponents = [...newInputActiveComponents];
    updatedComponents[index] = { ...updatedComponents[index], [name]: value };
    setNewInputActiveComponents(updatedComponents);
  };

  const handleAddActiveComponentRow = (isEditing = false) => {
    if (isEditing) {
      setEditingInputActiveComponents(prev => [...prev, { name: '', percentage: '' }]);
    } else {
      setNewInputActiveComponents(prev => [...prev, { name: '', percentage: '' }]);
    }
  };

  const handleRemoveActiveComponentRow = (index, isEditing = false) => {
    if (isEditing) {
      const updatedComponents = editingInputActiveComponents.filter((_, i) => i !== index);
      setEditingInputActiveComponents(updatedComponents);
    } else {
      const updatedComponents = newInputActiveComponents.filter((_, i) => i !== index);
      setNewInputActiveComponents(updatedComponents);
    }
  };

  const handleAddInput = async (e) => {
    e.preventDefault();
    if (!newInputName || !newInputUnit || !newInputPrice) {
      addNotification("Por favor, rellena todos los campos para el nuevo insumo.", "warning");
      return;
    }
    if (isNaN(parseFloat(newInputPrice))) {
      addNotification("El precio debe ser un número.", "warning");
      return;
    }
    if (newInputActiveComponents.some(c => !c.name.trim() || isNaN(parseFloat(c.percentage)) || parseFloat(c.percentage) < 0)) {
      addNotification("Asegúrate de que todos los componentes activos tengan un nombre y un porcentaje numérico válido.", "warning");
      return;
    }

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/input_catalog`), {
        name: newInputName,
        unit: newInputUnit,
        price: parseFloat(newInputPrice),
        activeComponents: newInputActiveComponents.map(c => ({ name: c.name.trim(), percentage: parseFloat(c.percentage) })),
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Insumo añadido exitosamente.", "success");
      setNewInputName('');
      setNewInputUnit('');
      setNewInputPrice('');
      setNewInputActiveComponents([{ name: '', percentage: '' }]);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir insumo:", error);
      addNotification("Error al añadir insumo.", "error");
    }
  };

  const handleEditInput = (inputId, currentPrice, currentComponents) => {
    setEditingInputId(inputId);
    setEditingInputPrice(currentPrice);
    setEditingInputActiveComponents(currentComponents.map(c => ({ ...c })));
  };

  const handleSaveInput = async (inputId) => {
    if (isNaN(parseFloat(editingInputPrice))) {
      addNotification("El precio debe ser un número.", "warning");
      return;
    }
    if (editingInputActiveComponents.some(c => !c.name.trim() || isNaN(parseFloat(c.percentage)) || parseFloat(c.percentage) < 0)) {
      addNotification("Asegúrate de que todos los componentes activos tengan un nombre y un porcentaje numérico válido.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const inputDocRef = doc(db, `artifacts/${appId}/public/data/input_catalog`, inputId);
      await updateDoc(inputDocRef, {
        price: parseFloat(editingInputPrice),
        activeComponents: editingInputActiveComponents.map(c => ({ name: c.name.trim(), percentage: parseFloat(c.percentage) })),
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Insumo actualizado exitosamente.", "success");
      setEditingInputId(null);
      setEditingInputPrice('');
      setEditingInputActiveComponents([]);
    } catch (error) {
      console.error("Error al actualizar insumo:", error);
      addNotification("Error al actualizar insumo.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingInputId(null);
    setEditingInputPrice('');
    setEditingInputActiveComponents([]);
  };

  const handleArchiveInput = async (inputId) => {
    if (!window.confirm("¿Estás seguro de que quieres archivar este insumo?")) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const inputDocRef = doc(db, `artifacts/${appId}/public/data/input_catalog`, inputId);
      await updateDoc(inputDocRef, {
        isActive: false,
        archivedAt: new Date(),
        archivedBy: userId
      });
      addNotification("Insumo archivado exitosamente.", "success");
    } catch (error) {
      console.error("Error al archivar insumo:", error);
      addNotification("Error al archivar insumo.", "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Gestión de Insumos</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nuevo Insumo
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddInput} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Nuevo Insumo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="newInputName" className="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
              <input
                type="text"
                id="newInputName"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                value={newInputName}
                onChange={(e) => setNewInputName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newInputUnit" className="block text-gray-700 text-sm font-bold mb-2">Unidad:</label>
              <input
                type="text"
                id="newInputUnit"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                value={newInputUnit}
                onChange={(e) => setNewInputUnit(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newInputPrice" className="block text-gray-700 text-sm font-bold mb-2">Precio ($):</label>
              <input
                type="number"
                step="0.01"
                id="newInputPrice"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                value={newInputPrice}
                onChange={(e) => setNewInputPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <h4 className="text-xl font-semibold text-gray-700 mb-3">Componentes Activos</h4>
          {newInputActiveComponents.map((component, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-3 border rounded-md bg-white">
              <div>
                <label htmlFor={`newCompName-${index}`} className="block text-gray-700 text-xs font-bold mb-1">Nombre Componente:</label>
                <input
                  type="text"
                  id={`newCompName-${index}`}
                  name="name"
                  value={component.name}
                  onChange={(e) => handleNewActiveComponentChange(index, e)}
                  className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="Ej: Mancozeb"
                  required
                />
              </div>
              <div>
                <label htmlFor={`newCompPerc-${index}`} className="block text-gray-700 text-xs font-bold mb-1">Porcentaje (%):</label>
                <input
                  type="number"
                  step="0.01"
                  id={`newCompPerc-${index}`}
                  name="percentage"
                  value={component.percentage}
                  onChange={(e) => handleNewActiveComponentChange(index, e)}
                  className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
              <div className="flex items-center pt-2">
                {newInputActiveComponents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveActiveComponentRow(index)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-md text-xs"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddActiveComponentRow(false)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm mt-2"
          >
            Añadir Otro Componente
          </button>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Insumo
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-gray-700 mb-4">Insumos Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-green-100 border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidad</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio ($)</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Componentes Activos</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inputs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No hay insumos registrados.
                </td>
              </tr>
            ) : (
              inputs.map((input) => (
                <tr key={input.id} className="hover:bg-gray-50">
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{input.name}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{input.unit}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingInputId === input.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingInputPrice}
                        onChange={(e) => setEditingInputPrice(e.target.value)}
                        className="shadow appearance-none border rounded w-24 py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap">{input.price.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingInputId === input.id ? (
                      <div>
                        {editingInputActiveComponents.map((component, index) => (
                          <div key={index} className="flex gap-1 items-center mb-1">
                            <input
                              type="text"
                              name="name"
                              value={component.name}
                              onChange={(e) => setEditingInputActiveComponents(prev => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}
                              className="shadow appearance-none border rounded py-0.5 px-1 text-gray-700 text-xs w-2/5"
                            />
                            <input
                              type="number"
                              step="0.01"
                              name="percentage"
                              value={component.percentage}
                              onChange={(e) => setEditingInputActiveComponents(prev => prev.map((item, i) => i === index ? { ...item, percentage: e.target.value } : item))}
                              className="shadow appearance-none border rounded py-0.5 px-1 text-gray-700 text-xs w-1/4"
                            />
                            <span className="text-xs text-gray-600">%</span>
                            {editingInputActiveComponents.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveActiveComponentRow(index, true)}
                                className="bg-red-400 hover:bg-red-500 text-white py-0.5 px-1 rounded-md text-xs"
                              >
                                X
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddActiveComponentRow(true)}
                          className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-0.5 px-1 rounded-md text-xs mt-1"
                        >
                          + Comp.
                        </button>
                      </div>
                    ) : (
                      <ul className="list-disc list-inside text-gray-900 whitespace-no-wrap text-sm">
                        {input.activeComponents && input.activeComponents.map((comp, idx) => (
                          <li key={idx}>{comp.name}: {comp.percentage}%</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingInputId === input.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveInput(input.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditInput(input.id, input.price, input.activeComponents || [])}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveInput(input.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Componente para la gestión de catálogo de productos
const ProductCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProductPrice, setEditingProductPrice] = useState('');
  const [editingProductUnit, setEditingProductUnit] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const productsColRef = collection(db, `artifacts/${appId}/public/data/product_catalog`);
      const q = query(productsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);
      }, (error) => {
        console.error("Error al obtener el catálogo de productos:", error);
        addNotification("Error al cargar productos.", "error");
      });

      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductUnit || !newProductPrice) {
      addNotification("Por favor, rellena todos los campos para el nuevo producto.", "warning");
      return;
    }
    if (isNaN(parseFloat(newProductPrice))) {
      addNotification("El precio debe ser un número.", "warning");
      return;
    }

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/product_catalog`), {
        name: newProductName,
        unit_of_sale: newProductUnit,
        price: parseFloat(newProductPrice),
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Producto añadido exitosamente.", "success");
      setNewProductName('');
      setNewProductUnit('');
      setNewProductPrice('');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir producto:", error);
      addNotification("Error al añadir producto.", "error");
    }
  };

  const handleEditProduct = (productId, currentPrice, currentUnit) => {
    setEditingProductId(productId);
    setEditingProductPrice(currentPrice);
    setEditingProductUnit(currentUnit);
  };

  const handleSaveProduct = async (productId) => {
    if (isNaN(parseFloat(editingProductPrice))) {
      addNotification("El precio debe ser un número.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const productDocRef = doc(db, `artifacts/${appId}/public/data/product_catalog`, productId);
      await updateDoc(productDocRef, {
        price: parseFloat(editingProductPrice),
        unit_of_sale: editingProductUnit,
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Producto actualizado exitosamente.", "success");
      setEditingProductId(null);
      setEditingProductPrice('');
      setEditingProductUnit('');
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      addNotification("Error al actualizar producto.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditingProductPrice('');
    setEditingProductUnit('');
  };

  const handleArchiveProduct = async (productId) => {
    if (!window.confirm("¿Estás seguro de que quieres archivar este producto?")) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const productDocRef = doc(db, `artifacts/${appId}/public/data/product_catalog`, productId);
      await updateDoc(productDocRef, {
        isActive: false,
        archivedAt: new Date(),
        archivedBy: userId
      });
      addNotification("Producto archivado exitosamente.", "success");
    } catch (error) {
      console.error("Error al archivar producto:", error);
      addNotification("Error al archivar producto.", "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Gestión de Productos</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nuevo Producto
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddProduct} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Nuevo Producto</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="newProductName" className="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
              <input
                type="text"
                id="newProductName"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newProductUnit" className="block text-gray-700 text-sm font-bold mb-2">Unidad de Venta:</label>
              <input
                type="text"
                id="newProductUnit"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                value={newProductUnit}
                onChange={(e) => setNewProductUnit(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newProductPrice" className="block text-gray-700 text-sm font-bold mb-2">Precio ($):</label>
              <input
                type="number"
                step="0.01"
                id="newProductPrice"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Producto
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-gray-700 mb-4">Productos Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-green-100 border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidad de Venta</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio ($)</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No hay productos registrados.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{product.name}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingProductId === product.id ? (
                      <input
                        type="text"
                        value={editingProductUnit}
                        onChange={(e) => setEditingProductUnit(e.target.value)}
                        className="shadow appearance-none border rounded w-24 py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap">{product.unit_of_sale}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingProductId === product.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingProductPrice}
                        onChange={(e) => setEditingProductPrice(e.target.value)}
                        className="shadow appearance-none border rounded w-24 py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap">{product.price.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingProductId === product.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveProduct(product.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(product.id, product.price, product.unit_of_sale)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveProduct(product.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Componente para el registro de Producción
const ProductionForm = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const locations = useLocations(); // Usar el hook para obtener ubicaciones
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    productId: '',
    quantityKg: '',
    locationId: '', // Cambiado de 'greenhouse' a 'locationId'
    quality: 'Media'
  });

  // Define handleChange locally
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const productsColRef = collection(db, `artifacts/${appId}/public/data/product_catalog`);
      const q = query(productsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);
      }, (error) => {
        console.error("Error al obtener el catálogo de productos para el formulario de producción:", error);
        addNotification("Error al cargar productos.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantityKg || !formData.locationId || !formData.quality || !formData.date) {
      addNotification("Por favor, rellena todos los campos.", "warning");
      return;
    }
    if (isNaN(parseFloat(formData.quantityKg)) || parseFloat(formData.quantityKg) <= 0) {
      addNotification("La cantidad en Kg debe ser un número positivo.", "warning");
      return;
    }

    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      if (!selectedProduct || !selectedLocation) {
        addNotification("Producto o ubicación seleccionados no válidos.", "error");
        return;
      }

      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/production_records`), {
        date: new Date(formData.date),
        productId: formData.productId,
        productName: selectedProduct.name,
        quantityKg: parseFloat(formData.quantityKg),
        locationId: formData.locationId,
        locationName: selectedLocation.name, // Guardar nombre de ubicación
        quality: formData.quality,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Registro de producción añadido exitosamente.", "success");
      setFormData({
        date: new Date().toISOString().split('T')[0],
        productId: '',
        quantityKg: '',
        locationId: '',
        quality: 'Media'
      });
    } catch (error) {
      console.error("Error al añadir registro de producción:", error);
      addNotification("Error al añadir registro de producción.", "error");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Registrar Producción</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="date" className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label htmlFor="productId" className="block text-gray-700 text-sm font-bold mb-2">Producto:</label>
          <select
            id="productId"
            name="productId"
            value={formData.productId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            required
          >
            <option value="">Selecciona un producto</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quantityKg" className="block text-gray-700 text-sm font-bold mb-2">Cantidad (Kg):</label>
          <input
            type="number"
            step="0.01"
            id="quantityKg"
            name="quantityKg"
            value={formData.quantityKg}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label htmlFor="locationId" className="block text-gray-700 text-sm font-bold mb-2">Ubicación (Invernadero):</label>
          <select
            id="locationId"
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            required
          >
            <option value="">Selecciona una ubicación</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quality" className="block text-gray-700 text-sm font-bold mb-2">Calidad:</label>
          <select
            id="quality"
            name="quality"
            value={formData.quality}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            required
          >
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Registrar Producción
          </button>
        </div>
      </form>
    </div>
  );
};


// Componente para el registro de Aplicación de Insumos
const InputApplicationForm = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const locations = useLocations();
  const [inputsCatalog, setInputsCatalog] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    objective: '',
    appliedInputs: [{ inputId: '', quantity: '', unit: '', price: 0 }]
  });

  // Define handleChange locally
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const inputsColRef = collection(db, `artifacts/${appId}/public/data/input_catalog`);
      const q = query(inputsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const inputsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInputsCatalog(inputsData);
      }, (error) => {
        console.error("Error al obtener el catálogo de insumos para el formulario de aplicación:", error);
        addNotification("Error al cargar catálogo de insumos.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  const handleInputChange = (index, e) => {
    const { name, value } = e.target;
    const newAppliedInputs = [...formData.appliedInputs];

    if (name === 'inputId') {
      const selectedInput = inputsCatalog.find(input => input.id === value);
      newAppliedInputs[index] = {
        ...newAppliedInputs[index],
        inputId: value,
        unit: selectedInput ? selectedInput.unit : '',
        price: selectedInput ? selectedInput.price : 0,
        inputName: selectedInput ? selectedInput.name : '',
      };
    } else {
      newAppliedInputs[index] = { ...newAppliedInputs[index], [name]: value };
    }

    if (name === 'quantity' || name === 'inputId') {
      const quantity = parseFloat(newAppliedInputs[index].quantity);
      const price = newAppliedInputs[index].price;
      newAppliedInputs[index].subtotal = (isNaN(quantity) || isNaN(price)) ? 0 : quantity * price;
    }

    setFormData(prev => ({ ...prev, appliedInputs: newAppliedInputs }));
  };

  const handleAddInputRow = () => {
    setFormData(prev => ({
      ...prev,
      appliedInputs: [...prev.appliedInputs, { inputId: '', quantity: '', unit: '', price: 0, subtotal: 0 }]
    }));
  };

  const handleRemoveInputRow = (index) => {
    const newAppliedInputs = formData.appliedInputs.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, appliedInputs: newAppliedInputs }));
  };

  const calculateTotalCost = () => {
    return formData.appliedInputs.reduce((total, item) => total + (item.subtotal || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.locationId || !formData.objective) {
      addNotification("Por favor, rellena la fecha, ubicación y objetivo.", "warning");
      return;
    }

    if (formData.appliedInputs.length === 0 || formData.appliedInputs.some(input => !input.inputId || !input.quantity || isNaN(parseFloat(input.quantity)) || parseFloat(input.quantity) <= 0)) {
      addNotification("Por favor, asegúrate de que todos los insumos aplicados estén completos y con cantidades válidas.", "warning");
      return;
    }

    const totalCost = calculateTotalCost();

    try {
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      if (!selectedLocation) {
        addNotification("Ubicación seleccionada no válida.", "error");
        return;
      }

      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/input_applications`), {
        date: new Date(formData.date),
        locationId: formData.locationId,
        locationName: selectedLocation.name,
        objective: formData.objective,
        appliedInputs: formData.appliedInputs.map(input => ({
          inputId: input.inputId,
          inputName: input.inputName,
          quantity: parseFloat(input.quantity),
          unit: input.unit,
          price: input.price,
          subtotal: input.subtotal
        })),
        totalCost: totalCost,
        createdAt: new Date(),
        createdBy: userId
      });

      await addDoc(collection(db, `artifacts/${appId}/public/data/costs`), {
        date: new Date(formData.date),
        type: 'Aplicación de Insumos',
        description: `Aplicación de insumos en ${selectedLocation.name} para ${formData.objective}`,
        amount: totalCost,
        createdAt: new Date(),
        createdBy: userId
      });

      addNotification(`Aplicación de insumos registrada exitosamente. Costo total: $${totalCost.toFixed(2)}`, "success");
      setFormData({
        date: new Date().toISOString().split('T')[0],
        locationId: '',
        objective: '',
        appliedInputs: [{ inputId: '', quantity: '', unit: '', price: 0 }]
      });
    } catch (error) {
      console.error("Error al registrar aplicación de insumos:", error);
      addNotification("Error al registrar aplicación de insumos.", "error");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Registrar Aplicación de Insumos</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="inputDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
            <input
              type="date"
              id="inputDate"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
          <div>
            <label htmlFor="locationId" className="block text-gray-700 text-sm font-bold mb-2">Ubicación (Invernadero):</label>
            <select
              id="locationId"
              name="locationId"
              value={formData.locationId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              required
            >
              <option value="">Selecciona una ubicación</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-6">
          <label htmlFor="inputObjective" className="block text-gray-700 text-sm font-bold mb-2">Objetivo:</label>
          <textarea
            id="inputObjective"
            name="objective"
            value={formData.objective}
            onChange={handleChange}
            rows="3"
            placeholder="Ej: Mitigar botrytis, fertilización foliar"
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          ></textarea>
        </div>

        <h3 className="text-2xl font-semibold text-gray-700 mb-4">Insumos Aplicados</h3>
        {formData.appliedInputs.map((item, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-md bg-gray-50">
            <div>
              <label htmlFor={`inputId-${index}`} className="block text-gray-700 text-sm font-bold mb-2">Insumo:</label>
              <select
                id={`inputId-${index}`}
                name="inputId"
                value={item.inputId}
                onChange={(e) => handleInputChange(index, e)}
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              >
                <option value="">Selecciona insumo</option>
                {inputsCatalog.map(input => (
                  <option key={input.id} value={input.id}>{input.name} ({input.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`quantity-${index}`} className="block text-gray-700 text-sm font-bold mb-2">Cantidad:</label>
              <input
                type="number"
                step="0.01"
                id={`quantity-${index}`}
                name="quantity"
                value={item.quantity}
                onChange={(e) => handleInputChange(index, e)}
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>
            <div className="flex items-center pt-2">
              <span className="text-gray-700 text-sm font-bold block mb-2">Unidad:</span>
              <p className="ml-2 text-gray-900">{item.unit || '-'}</p>
            </div>
            <div className="flex items-center pt-2">
              <span className="text-gray-700 text-sm font-bold block mb-2">Costo:</span>
              <p className="ml-2 text-gray-900">${item.subtotal ? item.subtotal.toFixed(2) : '0.00'}</p>
              {formData.appliedInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveInputRow(index)}
                  className="ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-md text-xs"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddInputRow}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105 mt-2 mb-6"
        >
          Añadir Otro Insumo
        </button>

        <div className="text-right text-2xl font-bold text-gray-800 mt-6">
          Costo Total: ${calculateTotalCost().toFixed(2)}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Registrar Aplicación
          </button>
        </div>
      </form>
    </div>
  );
};


// Componente para la gestión de Tipos de Labores
const LaborTypeCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [laborTypes, setLaborTypes] = useState([]);
  const [newLaborTypeName, setNewLaborTypeName] = useState('');
  const [editingLaborTypeId, setEditingLaborTypeId] = useState(null);
  const [editingLaborTypeName, setEditingLaborTypeName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const laborTypesColRef = collection(db, `artifacts/${appId}/public/data/labor_type_catalog`);
      const q = query(laborTypesColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const typesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLaborTypes(typesData);
      }, (error) => {
        console.error("Error al obtener el catálogo de tipos de labor:", error);
        addNotification("Error al cargar tipos de labor.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleAddLaborType = async (e) => {
    e.preventDefault();
    if (!newLaborTypeName.trim()) {
      addNotification("El nombre del tipo de labor no puede estar vacío.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/labor_type_catalog`), {
        name: newLaborTypeName.trim(),
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Tipo de labor añadido exitosamente.", "success");
      setNewLaborTypeName('');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir tipo de labor:", error);
      addNotification("Error al añadir tipo de labor.", "error");
    }
  };

  const handleEditLaborType = (typeId, currentName) => {
    setEditingLaborTypeId(typeId);
    setEditingLaborTypeName(currentName);
  };

  const handleSaveLaborType = async (typeId) => {
    if (!editingLaborTypeName.trim()) {
      addNotification("El nombre del tipo de labor no puede estar vacío.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const typeDocRef = doc(db, `artifacts/${appId}/public/data/labor_type_catalog`, typeId);
      await updateDoc(typeDocRef, {
        name: editingLaborTypeName.trim(),
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Tipo de labor actualizado exitosamente.", "success");
      setEditingLaborTypeId(null);
      setEditingLaborTypeName('');
    } catch (error) {
      console.error("Error al actualizar tipo de labor:", error);
      addNotification("Error al actualizar tipo de labor.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingLaborTypeId(null);
    setEditingLaborTypeName('');
  };

  const handleArchiveLaborType = async (typeId) => {
    if (!window.confirm("¿Estás seguro de que quieres archivar este tipo de labor?")) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const typeDocRef = doc(db, `artifacts/${appId}/public/data/labor_type_catalog`, typeId);
      await updateDoc(typeDocRef, {
        isActive: false,
        archivedAt: new Date(),
        archivedBy: userId
      });
      addNotification("Tipo de labor archivado exitosamente.", "success");
    } catch (error) {
      console.error("Error al archivar tipo de labor:", error);
      addNotification("Error al archivar tipo de labor.", "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Gestión de Tipos de Labores</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nuevo Tipo de Labor
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddLaborType} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Nuevo Tipo de Labor</h3>
          <div className="mb-4">
            <label htmlFor="newLaborTypeName" className="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
            <input
              type="text"
              id="newLaborTypeName"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              value={newLaborTypeName}
              onChange={(e) => setNewLaborTypeName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Tipo de Labor
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-gray-700 mb-4">Tipos de Labores Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-green-100 border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {laborTypes.length === 0 ? (
              <tr>
                <td colSpan="2" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No hay tipos de labor registrados.
                </td>
              </tr>
            ) : (
              laborTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingLaborTypeId === type.id ? (
                      <input
                        type="text"
                        value={editingLaborTypeName}
                        onChange={(e) => setEditingLaborTypeName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap">{type.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingLaborTypeId === type.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveLaborType(type.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditLaborType(type.id, type.name)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveLaborType(type.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// Componente para la gestión del Catálogo de Enfermedades
const DiseaseCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [diseases, setDiseases] = useState([]);
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newDiseaseSymptoms, setNewDiseaseSymptoms] = useState(''); // Nuevo campo
  const [newDiseaseIndications, setNewDiseaseIndications] = useState(''); // Nuevo campo
  const [editingDiseaseId, setEditingDiseaseId] = useState(null);
  const [editingDiseaseName, setEditingDiseaseName] = useState('');
  const [editingDiseaseSymptoms, setEditingDiseaseSymptoms] = useState('');
  const [editingDiseaseIndications, setEditingDiseaseIndications] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const diseasesColRef = collection(db, `artifacts/${appId}/public/data/disease_catalog`);
      const q = query(diseasesColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const diseasesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDiseases(diseasesData);
      }, (error) => {
        console.error("Error al obtener el catálogo de enfermedades:", error);
        addNotification("Error al cargar enfermedades.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleAddDisease = async (e) => {
    e.preventDefault();
    if (!newDiseaseName.trim()) {
      addNotification("El nombre de la enfermedad no puede estar vacío.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/disease_catalog`), {
        name: newDiseaseName.trim(),
        symptoms: newDiseaseSymptoms.trim(), // Guardar
        indications: newDiseaseIndications.trim(), // Guardar
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Enfermedad añadida exitosamente.", "success");
      setNewDiseaseName('');
      setNewDiseaseSymptoms('');
      setNewDiseaseIndications('');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir enfermedad:", error);
      addNotification("Error al añadir enfermedad.", "error");
    }
  };

  const handleEditDisease = (diseaseId, currentName, currentSymptoms, currentIndications) => {
    setEditingDiseaseId(diseaseId);
    setEditingDiseaseName(currentName);
    setEditingDiseaseSymptoms(currentSymptoms);
    setEditingDiseaseIndications(currentIndications);
  };

  const handleSaveDisease = async (diseaseId) => {
    if (!editingDiseaseName.trim()) {
      addNotification("El nombre de la enfermedad no puede estar vacío.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const diseaseDocRef = doc(db, `artifacts/${appId}/public/data/disease_catalog`, diseaseId);
      await updateDoc(diseaseDocRef, {
        name: editingDiseaseName.trim(),
        symptoms: editingDiseaseSymptoms.trim(),
        indications: editingDiseaseIndications.trim(),
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Enfermedad actualizada exitosamente.", "success");
      setEditingDiseaseId(null);
      setEditingDiseaseName('');
      setEditingDiseaseSymptoms('');
      setEditingDiseaseIndications('');
    } catch (error) {
      console.error("Error al actualizar enfermedad:", error);
      addNotification("Error al actualizar enfermedad.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingDiseaseId(null);
    setEditingDiseaseName('');
    setEditingDiseaseSymptoms('');
    setEditingDiseaseIndications('');
  };

  const handleArchiveDisease = async (diseaseId) => {
    if (!window.confirm("¿Estás seguro de que quieres archivar esta enfermedad?")) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const diseaseDocRef = doc(db, `artifacts/${appId}/public/data/disease_catalog`, diseaseId);
      await updateDoc(diseaseDocRef, {
        isActive: false,
        archivedAt: new Date(),
        archivedBy: userId
      });
      addNotification("Enfermedad archivada exitosamente.", "success");
    } catch (error) {
      console.error("Error al archivar enfermedad:", error);
      addNotification("Error al archivar enfermedad.", "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Gestión de Catálogo de Enfermedades</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nueva Enfermedad
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddDisease} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Nueva Enfermedad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="newDiseaseName" className="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
              <input
                type="text"
                id="newDiseaseName"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                value={newDiseaseName}
                onChange={(e) => setNewDiseaseName(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="newDiseaseSymptoms" className="block text-gray-700 text-sm font-bold mb-2">Síntomas:</label>
              <textarea
                id="newDiseaseSymptoms"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                value={newDiseaseSymptoms}
                onChange={(e) => setNewDiseaseSymptoms(e.target.value)}
                rows="3"
                placeholder="Ej: Hojas amarillas, manchas en el fruto, marchitez."
              ></textarea>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="newDiseaseIndications" className="block text-gray-700 text-sm font-bold mb-2">Indicaciones/Qué hacer:</label>
              <textarea
                id="newDiseaseIndications"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                value={newDiseaseIndications}
                onChange={(e) => setNewDiseaseIndications(e.target.value)}
                rows="3"
                placeholder="Ej: Aplicar fungicida X, remover plantas afectadas, mejorar ventilación."
              ></textarea>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Enfermedad
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-gray-700 mb-4">Enfermedades Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-green-100 border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Síntomas</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Indicaciones</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {diseases.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No hay enfermedades registradas.
                </td>
              </tr>
            ) : (
              diseases.map((disease) => (
                <tr key={disease.id} className="hover:bg-gray-50">
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingDiseaseId === disease.id ? (
                      <input
                        type="text"
                        value={editingDiseaseName}
                        onChange={(e) => setEditingDiseaseName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap">{disease.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingDiseaseId === disease.id ? (
                      <textarea
                        value={editingDiseaseSymptoms}
                        onChange={(e) => setEditingDiseaseSymptoms(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                        rows="2"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap text-sm">{disease.symptoms || 'N/A'}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingDiseaseId === disease.id ? (
                      <textarea
                        value={editingDiseaseIndications}
                        onChange={(e) => setEditingDiseaseIndications(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                        rows="2"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap text-sm">{disease.indications || 'N/A'}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingDiseaseId === disease.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveDisease(disease.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditDisease(disease.id, disease.name, disease.symptoms || '', disease.indications || '')}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveDisease(disease.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Componente para el registro de Labores
const LaborForm = () => {
  const { db, userId, isAuthReady, addNotification } = useContext(AppContext);
  const locations = useLocations();
  const [laborTypes, setLaborTypes] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    laborTypeId: '',
    observations: ''
  });

  // Define handleChange locally
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const laborTypesColRef = collection(db, `artifacts/${appId}/public/data/labor_type_catalog`);
      const q = query(laborTypesColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const typesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLaborTypes(typesData);
      }, (error) => {
        console.error("Error al obtener el catálogo de tipos de labor:", error);
        addNotification("Error al cargar tipos de labor.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.locationId || !formData.laborTypeId || !formData.observations) {
      addNotification("Por favor, rellena todos los campos.", "warning");
      return;
    }

    try {
      const selectedLaborType = laborTypes.find(type => type.id === formData.laborTypeId);
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      if (!selectedLaborType || !selectedLocation) {
        addNotification("Tipo de labor o ubicación seleccionados no válidos.", "error");
        return;
      }

      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/labor_records`), {
        date: new Date(formData.date),
        locationId: formData.locationId,
        locationName: selectedLocation.name,
        laborTypeId: formData.laborTypeId,
        laborTypeName: selectedLaborType.name,
        observations: formData.observations,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Labor registrada exitosamente.", "success");
      setFormData({
        date: new Date().toISOString().split('T')[0],
        locationId: '',
        laborTypeId: '',
        observations: ''
      });
    } catch (error) {
      console.error("Error al registrar labor:", error);
      addNotification("Error al registrar labor.", "error");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Registrar Labor</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="laborDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
          <input
            type="date"
            id="laborDate"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          />
        </div>
        <div>
          <label htmlFor="locationId" className="block text-gray-700 text-sm font-bold mb-2">Ubicación:</label>
          <select
            id="locationId"
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            required
          >
            <option value="">Selecciona una ubicación</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="laborTypeId" className="block text-gray-700 text-sm font-bold mb-2">Tipo de Labor:</label>
          <select
            id="laborTypeId"
            name="laborTypeId"
            value={formData.laborTypeId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          >
            <option value="">Selecciona un tipo de labor</option>
            {laborTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="observations" className="block text-gray-700 text-sm font-bold mb-2">Observaciones:</label>
          <textarea
            id="observations"
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            rows="4"
            placeholder="Detalles sobre la labor realizada..."
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          ></textarea>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Registrar Labor
          </button>
        </div>
      </form>
    </div>
  );
};

// Componente para reportar una Enfermedad
const ReportDiseaseForm = () => {
  const { db, userId, isAuthReady, addNotification } = useContext(AppContext);
  const locations = useLocations();
  const [diseases, setDiseases] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    diseaseId: '',
    severity: 'Baja',
    comments: '',
    photoUrl: ''
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState('');

  // Define handleChange locally
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const diseasesColRef = collection(db, `artifacts/${appId}/public/data/disease_catalog`);
      const q = query(diseasesColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const diseasesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDiseases(diseasesData);
      }, (error) => {
        console.error("Error al obtener el catálogo de enfermedades:", error);
        addNotification("Error al cargar enfermedades.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  const handleSuggestDiagnosis = async () => {
    if (!formData.comments.trim()) {
      addNotification("Por favor, introduce comentarios sobre los síntomas para la sugerencia de diagnóstico.", "warning");
      return;
    }

    setAiLoading(true);
    setAiDiagnosis('');
    addNotification("Generando sugerencia de diagnóstico IA...", "info", 0);

    try {
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      const selectedDisease = diseases.find(d => d.id === formData.diseaseId);

      const prompt = `Soy un agricultor de fresas hidropónicas. Mis plantas en ${selectedLocation ? selectedLocation.name : 'una ubicación no especificada'} están mostrando los siguientes síntomas: "${formData.comments}". La severidad reportada es "${formData.severity}". Si ya he identificado la enfermedad como "${selectedDisease ? selectedDisease.name : 'no especificada'}".
      Basado en estos síntomas, ¿cuál podría ser la enfermedad más probable y qué acciones iniciales debo tomar para diagnosticarla o mitigarla? Por favor, sé conciso y proporciona pasos accionables.`;

      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error en la API de Gemini: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setAiDiagnosis(text);
        addNotification("Sugerencia de diagnóstico IA generada.", "success");
      } else {
        addNotification("No se pudo generar una sugerencia de diagnóstico. Inténtalo de nuevo.", "warning");
      }
    } catch (error) {
      console.error("Error al llamar a la API de Gemini:", error);
      addNotification("Error al conectar con la IA para el diagnóstico: " + error.message, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.locationId || !formData.diseaseId || !formData.severity) {
      addNotification("Por favor, rellena los campos obligatorios: Fecha, Ubicación, Enfermedad y Severidad.", "warning");
      return;
    }

    try {
      const selectedDisease = diseases.find(disease => disease.id === formData.diseaseId);
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      if (!selectedDisease || !selectedLocation) {
        addNotification("Enfermedad o ubicación seleccionadas no válidas.", "error");
        return;
      }

      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/disease_reports`), {
        date: new Date(formData.date),
        locationId: formData.locationId,
        locationName: selectedLocation.name,
        diseaseId: formData.diseaseId,
        diseaseName: selectedDisease.name,
        severity: formData.severity,
        comments: formData.comments,
        photoUrl: formData.photoUrl,
        aiDiagnosisSuggestion: aiDiagnosis,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Reporte de enfermedad registrado exitosamente.", "success");
      setFormData({
        date: new Date().toISOString().split('T')[0],
        locationId: '',
        diseaseId: '',
        severity: 'Baja',
        comments: '',
        photoUrl: ''
      });
      setAiDiagnosis('');
    } catch (error) {
      console.error("Error al registrar reporte de enfermedad:", error);
      addNotification("Error al registrar reporte de enfermedad.", "error");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Reportar Enfermedad</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="diseaseDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
          <input
            type="date"
            id="diseaseDate"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          />
        </div>
        <div>
          <label htmlFor="locationId" className="block text-gray-700 text-sm font-bold mb-2">Ubicación:</label>
          <select
            id="locationId"
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            required
          >
            <option value="">Selecciona una ubicación</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="diseaseId" className="block text-gray-700 text-sm font-bold mb-2">Enfermedad:</label>
          <select
            id="diseaseId"
            name="diseaseId"
            value={formData.diseaseId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          >
            <option value="">Selecciona una enfermedad</option>
            {diseases.map(disease => (
              <option key={disease.id} value={disease.id}>{disease.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="severity" className="block text-gray-700 text-sm font-bold mb-2">Severidad:</label>
          <select
            id="severity"
            name="severity"
            value={formData.severity}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <div>
          <label htmlFor="photoUrl" className="block text-gray-700 text-sm font-bold mb-2">URL de la Foto (opcional):</label>
          <input
            type="text"
            id="photoUrl"
            name="photoUrl"
            value={formData.photoUrl}
            onChange={handleChange}
            placeholder="Pega aquí la URL de una imagen"
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <p className="text-xs text-gray-500 mt-1">
            La carga directa de archivos no está implementada aún. Puedes pegar una URL de imagen temporalmente.
          </p>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="comments" className="block text-gray-700 text-sm font-bold mb-2">Comentarios:</label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            rows="4"
            placeholder="Observaciones adicionales sobre la enfermedad detectada..."
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
          ></textarea>
          <button
            type="button"
            onClick={handleSuggestDiagnosis}
            disabled={aiLoading}
            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading ? 'Generando...' : 'Sugerir Diagnóstico IA ✨'}
          </button>
        </div>

        {aiDiagnosis && (
          <div className="md:col-span-2 mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Sugerencia de Diagnóstico IA:</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{aiDiagnosis}</p>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Registrar Reporte
          </button>
        </div>
      </form>
    </div>
  );
};

// Componente para la gestión del Catálogo de Recetas de Nutrientes
const NutrientRecipeCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [recipes, setRecipes] = useState([]);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeNutrients, setNewRecipeNutrients] = useState([{ name: '', proportion: '' }]);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [editingRecipeName, setEditingRecipeName] = useState('');
  const [editingRecipeNutrients, setEditingRecipeNutrients] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const recipesColRef = collection(db, `artifacts/${appId}/public/data/nutrient_recipes`);
      const q = query(recipesColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const recipesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecipes(recipesData);
      }, (error) => {
        console.error("Error al obtener el catálogo de recetas de nutrientes:", error);
        addNotification("Error al cargar recetas.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleNewNutrientChange = (index, e) => {
    const { name, value } = e.target;
    const updatedNutrients = [...newRecipeNutrients];
    updatedNutrients[index] = { ...updatedNutrients[index], [name]: value };
    setNewRecipeNutrients(updatedNutrients);
  };

  const handleAddNutrientRow = (isEditing = false) => {
    if (isEditing) {
      setEditingRecipeNutrients(prev => [...prev, { name: '', proportion: '' }]);
    } else {
      setNewRecipeNutrients(prev => [...prev, { name: '', proportion: '' }]);
    }
  };

  const handleRemoveNutrientRow = (index, isEditing = false) => {
    if (isEditing) {
      const updatedNutrients = editingRecipeNutrients.filter((_, i) => i !== index);
      setEditingRecipeNutrients(updatedNutrients);
    } else {
      const updatedNutrients = newRecipeNutrients.filter((_, i) => i !== index);
      setNewRecipeNutrients(updatedNutrients);
    }
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    if (!newRecipeName.trim()) {
      addNotification("El nombre de la receta no puede estar vacío.", "warning");
      return;
    }
    if (newRecipeNutrients.some(n => !n.name.trim() || isNaN(parseFloat(n.proportion)) || parseFloat(n.proportion) <= 0)) {
      addNotification("Asegúrate de que todos los nutrientes tengan un nombre y una proporción numérica positiva.", "warning");
      return;
    }

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/nutrient_recipes`), {
        name: newRecipeName.trim(),
        nutrients: newRecipeNutrients.map(n => ({ name: n.name.trim(), proportion: parseFloat(n.proportion) })),
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Receta de nutrientes añadida exitosamente.", "success");
      setNewRecipeName('');
      setNewRecipeNutrients([{ name: '', proportion: '' }]);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir receta de nutrientes:", error);
      addNotification("Error al añadir receta de nutrientes.", "error");
    }
  };

  const handleEditRecipe = (recipeId, currentName, currentNutrients) => {
    setEditingRecipeId(recipeId);
    setEditingRecipeName(currentName);
    setEditingRecipeNutrients(currentNutrients.map(n => ({ ...n })));
  };

  const handleEditingNutrientChange = (index, e) => {
    const { name, value } = e.target;
    const updatedNutrients = [...editingRecipeNutrients];
    updatedNutrients[index] = { ...updatedNutrients[index], [name]: value };
    setEditingRecipeNutrients(updatedNutrients);
  };

  const handleSaveRecipe = async (recipeId) => {
    if (!editingRecipeName.trim()) {
      addNotification("El nombre de la receta no puede estar vacío.", "warning");
      return;
    }
    if (editingRecipeNutrients.some(n => !n.name.trim() || isNaN(parseFloat(n.proportion)) || parseFloat(n.proportion) <= 0)) {
      addNotification("Asegúrate de que todos los nutrientes tengan un nombre y una proporción numérica positiva.", "warning");
      return;
    }

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const recipeDocRef = doc(db, `artifacts/${appId}/public/data/nutrient_recipes`, recipeId);
      await updateDoc(recipeDocRef, {
        name: editingRecipeName.trim(),
        nutrients: editingRecipeNutrients.map(n => ({ name: n.name.trim(), proportion: parseFloat(n.proportion) })),
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Receta de nutrientes actualizada exitosamente.", "success");
      setEditingRecipeId(null);
      setEditingRecipeName('');
      setEditingRecipeNutrients([]);
    } catch (error) {
      console.error("Error al actualizar receta de nutrientes:", error);
      addNotification("Error al actualizar receta de nutrientes.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setEditingRecipeName('');
    setEditingRecipeNutrients([]);
  };

  const handleArchiveRecipe = async (recipeId) => {
    if (!window.confirm("¿Estás seguro de que quieres archivar esta receta?")) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const recipeDocRef = doc(db, `artifacts/${appId}/public/data/nutrient_recipes`, recipeId);
      await updateDoc(recipeDocRef, {
        isActive: false,
        archivedAt: new Date(),
        archivedBy: userId
      });
      addNotification("Receta de nutrientes archivada exitosamente.", "success");
    } catch (error) {
      console.error("Error al archivar receta de nutrientes:", error);
      addNotification("Error al archivar receta de nutrientes.", "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Gestión de Recetas de Nutrientes</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nueva Receta
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddRecipe} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Nueva Receta</h3>
          <div className="mb-4">
            <label htmlFor="newRecipeName" className="block text-gray-700 text-sm font-bold mb-2">Nombre de la Receta:</label>
            <input
              type="text"
              id="newRecipeName"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
              required
            />
          </div>
          <h4 className="text-xl font-semibold text-gray-700 mb-3">Nutrientes y Proporciones</h4>
          {newRecipeNutrients.map((nutrient, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-3 border rounded-md bg-white">
              <div>
                <label htmlFor={`newNutrientName-${index}`} className="block text-gray-700 text-xs font-bold mb-1">Nombre Nutriente:</label>
                <input
                  type="text"
                  id={`newNutrientName-${index}`}
                  name="name"
                  value={nutrient.name}
                  onChange={(e) => handleNewNutrientChange(index, e)}
                  className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="Ej: Nitrato de Calcio"
                  required
                />
              </div>
              <div>
                <label htmlFor={`newNutrientProportion-${index}`} className="block text-gray-700 text-xs font-bold mb-1">Proporción (g/L):</label>
                <input
                  type="number"
                  step="0.01"
                  id={`newNutrientProportion-${index}`}
                  name="proportion"
                  value={nutrient.proportion}
                  onChange={(e) => handleNewNutrientChange(index, e)}
                  className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
              <div className="flex items-center pt-2">
                {newRecipeNutrients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNutrientRow(index)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-md text-xs"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddNutrientRow(false)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm mt-2"
          >
            Añadir Otro Nutriente
          </button>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Receta
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-gray-700 mb-4">Recetas Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-green-100 border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre de Receta</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nutrientes (Proporción g/L)</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recipes.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No hay recetas de nutrientes registradas.
                </td>
              </tr>
            ) : (
              recipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-gray-50">
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingRecipeId === recipe.id ? (
                      <input
                        type="text"
                        value={editingRecipeName}
                        onChange={(e) => setEditingRecipeName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap">{recipe.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingRecipeId === recipe.id ? (
                      <div>
                        {editingRecipeNutrients.map((nutrient, index) => (
                          <div key={index} className="flex gap-2 items-center mb-1">
                            <input
                              type="text"
                              name="name"
                              value={nutrient.name}
                              onChange={(e) => handleEditingNutrientChange(index, e)}
                              className="shadow appearance-none border rounded py-1 px-2 text-gray-700 text-xs w-2/5"
                            />
                            <input
                              type="number"
                              step="0.01"
                              name="proportion"
                              value={nutrient.proportion}
                              onChange={(e) => handleEditingNutrientChange(index, e)}
                              className="shadow appearance-none border rounded py-1 px-2 text-gray-700 text-xs w-1/4"
                            />
                            <span className="text-xs text-gray-600">g/L</span>
                            {editingRecipeNutrients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNutrientRow(index, true)}
                                className="bg-red-400 hover:bg-red-500 text-white py-0.5 px-1 rounded-md text-xs"
                              >
                                X
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddNutrientRow(true)}
                          className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-1 px-2 rounded-md text-xs mt-2"
                        >
                          + Nutriente
                        </button>
                      </div>
                    ) : (
                      <ul className="list-disc list-inside text-gray-900 whitespace-no-wrap">
                        {recipe.nutrients.map((nutrient, index) => (
                          <li key={index}>{nutrient.name}: {nutrient.proportion} g/L</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingRecipeId === recipe.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveRecipe(recipe.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditRecipe(recipe.id, recipe.name, recipe.nutrients)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveRecipe(recipe.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// Componente para el cálculo de la mezcla de nutrientes
const NutrientMixCalculatorForm = () => {
  const { db, isAuthReady, addNotification } = useContext(AppContext);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [mixLiters, setMixLiters] = useState('');
  const [calculatedNutrients, setCalculatedNutrients] = useState([]);

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const recipesColRef = collection(db, `artifacts/${appId}/public/data/nutrient_recipes`);
      const q = query(recipesColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const recipesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecipes(recipesData);
      }, (error) => {
        console.error("Error al obtener las recetas de nutrientes:", error);
        addNotification("Error al cargar recetas de nutrientes.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  const handleCalculateMix = (e) => {
    e.preventDefault();
    if (!selectedRecipeId || !mixLiters) {
      addNotification("Por favor, selecciona una receta e ingresa la cantidad de litros.", "warning");
      setCalculatedNutrients([]);
      return;
    }
    if (isNaN(parseFloat(mixLiters)) || parseFloat(mixLiters) <= 0) {
      addNotification("La cantidad de litros debe ser un número positivo.", "warning");
      setCalculatedNutrients([]);
      return;
    }

    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
    if (!selectedRecipe) {
      addNotification("Receta seleccionada no válida.", "error");
      setCalculatedNutrients([]);
      return;
    }

    const liters = parseFloat(mixLiters);
    const results = selectedRecipe.nutrients.map(nutrient => ({
      name: nutrient.name,
      grams: (nutrient.proportion * liters).toFixed(2)
    }));
    setCalculatedNutrients(results);
    addNotification("Cálculo realizado con éxito.", "success");
  };

  const handleClear = () => {
    setSelectedRecipeId('');
    setMixLiters('');
    setCalculatedNutrients([]);
    addNotification("Campos de la calculadora limpiados.", "info");
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Calculadora de Mezcla de Nutrientes</h2>
      <form onSubmit={handleCalculateMix} className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="recipeSelect" className="block text-gray-700 text-sm font-bold mb-2">Selecciona una Receta:</label>
          <select
            id="recipeSelect"
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          >
            <option value="">-- Selecciona una receta --</option>
            {recipes.map(recipe => (
              <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mixLiters" className="block text-gray-700 text-sm font-bold mb-2">Cantidad de Litros a Preparar:</label>
          <input
            type="number"
            step="0.01"
            id="mixLiters"
            value={mixLiters}
            onChange={(e) => setMixLiters(e.target.value)}
            placeholder="Ej: 200"
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          />
        </div>
        <div className="flex justify-end gap-4 mt-4">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Calcular
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Limpiar
          </button>
        </div>
      </form>

      {calculatedNutrients.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Cantidades Calculadas:</h3>
          <ul className="list-disc list-inside text-gray-800 text-lg">
            {calculatedNutrients.map((nutrient, index) => (
              <li key={index} className="mb-2">
                <span className="font-semibold">{nutrient.name}:</span> {nutrient.grams} gramos
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};


// Componente para la asignación de tareas (Planificación de Labores)
const TaskAssignmentForm = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const locations = useLocations();
  const [laborTypes, setLaborTypes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [inputsCatalog, setInputsCatalog] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    laborTypeId: '',
    assignedToUserId: '',
    plannedInputs: [{ inputId: '', quantity: '', unit: '' }],
  });
  const [showPlannedInputs, setShowPlannedInputs] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Define handleChange locally
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    const selectedLaborType = laborTypes.find(type => type.id === value);
    if (name === 'laborTypeId' && selectedLaborType && selectedLaborType.name.toLowerCase().includes('insumos')) {
      setShowPlannedInputs(true);
    } else if (name === 'laborTypeId') {
      setShowPlannedInputs(false);
      setFormData(prev => ({ ...prev, plannedInputs: [{ inputId: '', quantity: '', unit: '' }] }));
    }
  };

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

      const unsubscribeLaborTypes = onSnapshot(
        query(collection(db, `artifacts/${appId}/public/data/labor_type_catalog`), where('isActive', '==', true)),
        (snapshot) => {
          setLaborTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        },
        (error) => {
          console.error("Error al cargar tipos de labor:", error);
          addNotification("Error al cargar tipos de labor.", "error");
        }
      );

      const unsubscribeOperators = onSnapshot(
        query(collection(db, `artifacts/${appId}/public/data/users`), where('role', '==', 'basic'), where('isActive', '==', true)),
        (snapshot) => {
          setOperators(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        },
        (error) => {
          console.error("Error al cargar operarios:", error);
          addNotification("Error al cargar operarios.", "error");
        }
      );

      const unsubscribeInputs = onSnapshot(
        query(collection(db, `artifacts/${appId}/public/data/input_catalog`), where('isActive', '==', true)),
        (snapshot) => {
          setInputsCatalog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        },
        (error) => {
          console.error("Error al cargar catálogo de insumos:", error);
          addNotification("Error al cargar insumos.", "error");
        }
      );


      return () => {
        unsubscribeLaborTypes();
        unsubscribeOperators();
        unsubscribeInputs();
      };
    }
  }, [db, isAuthReady, userRole, addNotification]);

  const handlePlannedInputChange = (index, e) => {
    const { name, value } = e.target;
    const newPlannedInputs = [...formData.plannedInputs];

    if (name === 'inputId') {
      const selectedInput = inputsCatalog.find(input => input.id === value);
      newPlannedInputs[index] = {
        ...newPlannedInputs[index],
        inputId: value,
        unit: selectedInput ? selectedInput.unit : '',
        inputName: selectedInput ? selectedInput.name : '',
      };
    } else {
      newPlannedInputs[index] = { ...newPlannedInputs[index], [name]: value };
    }
    setFormData(prev => ({ ...prev, plannedInputs: newPlannedInputs }));
  };

  const handleAddPlannedInputRow = () => {
    setFormData(prev => ({
      ...prev,
      plannedInputs: [...prev.plannedInputs, { inputId: '', quantity: '', unit: '' }]
    }));
  };

  const handleRemovePlannedInputRow = (index) => {
    const newPlannedInputs = formData.plannedInputs.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, plannedInputs: newPlannedInputs }));
  };

  const handleGenerateDescription = async () => {
    if (!formData.name.trim() || !formData.laborTypeId) {
      addNotification("Por favor, introduce el nombre y tipo de tarea para generar la descripción.", "warning");
      return;
    }

    setAiLoading(true);
    addNotification("Generando descripción IA...", "info", 0);

    try {
      const selectedLaborType = laborTypes.find(type => type.id === formData.laborTypeId);
      const prompt = `Genera una descripción detallada para una tarea de gestión de fresas hidropónicas.
      Nombre de la tarea: "${formData.name}".
      Tipo de labor: "${selectedLaborType ? selectedLaborType.name : 'no especificado'}".
      Considera que la tarea es para un operario. Enfócate en los pasos clave y la importancia de la tarea. Sé conciso y profesional.`;

      const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error en la API de Gemini: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setFormData(prev => ({ ...prev, description: text }));
        addNotification("Descripción IA generada y aplicada.", "success");
      } else {
        addNotification("No se pudo generar una descripción. Inténtalo de nuevo.", "warning");
      }
    } catch (error) {
      console.error("Error al llamar a la API de Gemini:", error);
      addNotification("Error al conectar con la IA para la descripción: " + error.message, "error");
    } finally {
      setAiLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.date || !formData.locationId || !formData.laborTypeId || !formData.assignedToUserId) {
      addNotification("Por favor, rellena todos los campos obligatorios.", "warning");
      return;
    }

    if (showPlannedInputs && (formData.plannedInputs.length === 0 || formData.plannedInputs.some(input => !input.inputId || !input.quantity || isNaN(parseFloat(input.quantity)) || parseFloat(input.quantity) <= 0))) {
      addNotification("Por favor, asegúrate de que todos los insumos planificados estén completos y con cantidades válidas.", "warning");
      return;
    }

    try {
      const selectedLaborType = laborTypes.find(type => type.id === formData.laborTypeId);
      const assignedOperator = operators.find(op => op.id === formData.assignedToUserId);
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);

      if (!selectedLaborType || !assignedOperator || !selectedLocation) {
        addNotification("Tipo de labor, operario o ubicación asignados no válidos.", "error");
        return;
      }

      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/tasks`), {
        name: formData.name,
        description: formData.description,
        date: new Date(formData.date),
        locationId: formData.locationId,
        locationName: selectedLocation.name,
        laborTypeId: formData.laborTypeId,
        laborTypeName: selectedLaborType.name,
        assignedToUserId: formData.assignedToUserId,
        assignedToUserName: assignedOperator.email || assignedOperator.id,
        status: 'pending',
        assignedByUserId: userId,
        createdAt: new Date(),
        plannedInputs: showPlannedInputs ? formData.plannedInputs.map(input => ({
          inputId: input.inputId,
          inputName: input.inputName,
          quantity: parseFloat(input.quantity),
          unit: input.unit
        })) : [],
      });
      addNotification("Tarea asignada exitosamente.", "success");
      setFormData({
        name: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        locationId: '',
        laborTypeId: '',
        assignedToUserId: '',
        plannedInputs: [{ inputId: '', quantity: '', unit: '' }],
      });
      setShowPlannedInputs(false);
    } catch (error) {
      console.error("Error al asignar tarea:", error);
      addNotification("Error al asignar tarea.", "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Planificación de Labores (Asignar Tareas)</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="taskName" className="block text-gray-700 text-sm font-bold mb-2">Nombre de la Tarea:</label>
            <input
              type="text"
              id="taskName"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Poda de brotes laterales"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
          <div>
            <label htmlFor="taskDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha Límite:</label>
            <input
              type="date"
              id="taskDate"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
          <div>
            <label htmlFor="locationId" className="block text-gray-700 text-sm font-bold mb-2">Ubicación:</label>
            <select
              id="locationId"
              name="locationId"
              value={formData.locationId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              required
            >
              <option value="">Selecciona una ubicación</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="laborTypeId" className="block text-gray-700 text-sm font-bold mb-2">Tipo de Labor:</label>
            <select
              id="laborTypeId"
              name="laborTypeId"
              value={formData.laborTypeId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            >
              <option value="">Selecciona un tipo de labor</option>
              {laborTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="assignedToUserId" className="block text-gray-700 text-sm font-bold mb-2">Asignar a Operario:</label>
            <select
              id="assignedToUserId"
              name="assignedToUserId"
              value={formData.assignedToUserId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            >
              <option value="">Selecciona un operario</option>
              {operators.map(operator => (
                <option key={operator.id} value={operator.id}>{operator.email || operator.id}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Descripción / Observaciones:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Detalles adicionales sobre la tarea a realizar."
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            ></textarea>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={aiLoading}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? 'Generando...' : 'Generar Descripción IA ✨'}
            </button>
          </div>
        </div>

        {showPlannedInputs && (
          <div className="mb-6 p-6 bg-gray-100 rounded-lg shadow-inner">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Insumos Planificados (Opcional)</h3>
            {formData.plannedInputs.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-md bg-white">
                <div>
                  <label htmlFor={`plannedInputId-${index}`} className="block text-gray-700 text-sm font-bold mb-2">Insumo:</label>
                  <select
                    id={`plannedInputId-${index}`}
                    name="inputId"
                    value={item.inputId}
                    onChange={(e) => handlePlannedInputChange(index, e)}
                    className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                    required
                  >
                    <option value="">Selecciona insumo</option>
                    {inputsCatalog.map(input => (
                      <option key={input.id} value={input.id}>{input.name} ({input.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`plannedQuantity-${index}`} className="block text-gray-700 text-sm font-bold mb-2">Cantidad:</label>
                  <input
                    type="number"
                    step="0.01"
                    id={`plannedQuantity-${index}`}
                    name="quantity"
                    value={item.quantity}
                    onChange={(e) => handlePlannedInputChange(index, e)}
                    className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                    required
                  />
                </div>
                <div className="flex items-center pt-2">
                  <span className="text-gray-700 text-sm font-bold block mb-2">Unidad:</span>
                  <p className="ml-2 text-gray-900">{item.unit || '-'}</p>
                </div>
                <div className="flex items-center pt-2">
                  {formData.plannedInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlannedInputRow(index)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-md text-xs"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddPlannedInputRow}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105 mt-2"
            >
              Añadir Otro Insumo Planificado
            </button>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Asignar Tarea
          </button>
        </div>
      </form>
    </div>
  );
};


// Componente para ver las actividades asignadas a un operario
const MyActivities = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [assignedTasks, setAssignedTasks] = useState([]);

  useEffect(() => {
    if (db && isAuthReady && userId) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const tasksColRef = collection(db, `artifacts/${appId}/public/data/tasks`);
      const q = query(tasksColRef, where('assignedToUserId', '==', userId));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        tasksData.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return a.date.toDate().getTime() - b.date.toDate().getTime();
        });
        setAssignedTasks(tasksData);
      }, (error) => {
        console.error("Error al obtener las tareas asignadas:", error);
        addNotification("Error al cargar tus actividades.", "error");
      });

      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, addNotification]);

  const handleMarkAsCompleted = async (taskId) => {
    if (!window.confirm("¿Estás seguro de que quieres marcar esta tarea como completada?")) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const taskDocRef = doc(db, `artifacts/${appId}/public/data/tasks`, taskId);
      await updateDoc(taskDocRef, {
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
      });
      addNotification("Tarea marcada como completada exitosamente.", "success");
    } catch (error) {
      console.error("Error al marcar tarea como completada:", error);
      addNotification("Error al marcar tarea como completada.", "error");
    }
  };

  if (userRole !== 'basic') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Mis Actividades Asignadas</h2>
      {assignedTasks.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No tienes actividades asignadas actualmente.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedTasks.map(task => (
            <div key={task.id} className={`p-6 rounded-lg shadow-md ${task.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{task.name}</h3>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Tipo:</span> {task.laborTypeName}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Ubicación:</span> {task.locationName}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Fecha Límite:</span> {task.date.toDate().toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-medium">Estado:</span>{" "}
                <span className={`font-semibold ${task.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {task.status === 'pending' ? 'Pendiente' : 'Completada'}
                </span>
              </p>
              {task.description && (
                <p className="text-sm text-gray-700 mb-3">
                  <span className="font-medium">Observaciones:</span> {task.description}
                </p>
              )}
              {task.plannedInputs && task.plannedInputs.length > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  <p className="font-medium">Insumos Planificados:</p>
                  <ul className="list-disc list-inside ml-4">
                    {task.plannedInputs.map((input, idx) => (
                      <li key={idx}>{input.inputName}: {input.quantity} {input.unit}</li>
                    ))}
                  </ul>
                </div>
              )}
              {task.status === 'completed' && task.completedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Completada el: {task.completedAt.toDate().toLocaleDateString()}
                </p>
              )}
              {task.status === 'pending' && (
                <button
                  onClick={() => handleMarkAsCompleted(task.id)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105 w-full"
                >
                  Marcar como Completada
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// Componente para el Dashboard de Reportes
const ReportsDashboard = () => {
  const { db, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const locations = useLocations(); // Usar el hook para obtener ubicaciones
  const [reportType, setReportType] = useState('production_records');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  const reportCollections = {
    'production_records': {
      name: 'Registros de Producción',
      fields: ['date', 'locationName', 'productName', 'quantityKg', 'quality'],
      headers: ['Fecha', 'Ubicación', 'Producto', 'Cantidad (Kg)', 'Calidad']
    },
    'input_applications': {
      name: 'Aplicación de Insumos',
      fields: ['date', 'locationName', 'objective', 'appliedInputs', 'totalCost'],
      headers: ['Fecha', 'Ubicación', 'Objetivo', 'Insumos', 'Costo Total ($)']
    },
    'labor_records': {
      name: 'Registros de Labores',
      fields: ['date', 'locationName', 'laborTypeName', 'observations'],
      headers: ['Fecha', 'Ubicación', 'Tipo de Labor', 'Observaciones']
    },
    'disease_reports': {
      name: 'Reportes de Enfermedades',
      fields: ['date', 'locationName', 'diseaseName', 'severity', 'comments', 'photoUrl', 'aiDiagnosisSuggestion'],
      headers: ['Fecha', 'Ubicación', 'Enfermedad', 'Severidad', 'Comentarios', 'Foto', 'Sug. IA']
    },
    'tasks': {
      name: 'Tareas Asignadas',
      fields: ['date', 'name', 'laborTypeName', 'locationName', 'assignedToUserName', 'status', 'description', 'plannedInputs'],
      headers: ['Fecha Límite', 'Tarea', 'Tipo Labor', 'Ubicación', 'Asignado A', 'Estado', 'Descripción', 'Insumos Planificados']
    },
    'costs': {
      name: 'Registros de Costos',
      fields: ['date', 'type', 'description', 'amount'],
      headers: ['Fecha', 'Tipo', 'Descripción', 'Monto ($)']
    },
  };

  const fetchReport = async () => {
    if (!db || !isAuthReady) {
      addNotification("La base de datos no está lista.", "error");
      return;
    }
    if (userRole !== 'admin') {
      addNotification("No tienes permisos para ver reportes.", "error");
      return;
    }

    setLoading(true);
    setReportData([]);
    addNotification("Generando reporte...", "info", 0);

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      let qRef = collection(db, `artifacts/${appId}/public/data/${reportType}`);
      let qFilters = [];

      if (startDate) {
        qFilters.push(where('date', '>=', new Date(startDate)));
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        qFilters.push(where('date', '<=', endDateTime));
      }
      if (locationFilter) {
        qFilters.push(where('locationName', '==', locationFilter));
      }

      const q = query(qRef, ...qFilters);
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const formattedData = data.map(item => {
        const newItem = { ...item };
        if (newItem.date && typeof newItem.date.toDate === 'function') {
          newItem.date = newItem.date.toDate().toLocaleDateString();
        }
        if (newItem.createdAt && typeof newItem.createdAt.toDate === 'function') {
          newItem.createdAt = newItem.createdAt.toDate().toLocaleDateString();
        }
        if (newItem.completedAt && typeof newItem.completedAt.toDate === 'function') {
          newItem.completedAt = newItem.completedAt.toDate().toLocaleDateString();
        }
        return newItem;
      });

      setReportData(formattedData);
      if (formattedData.length === 0) {
        addNotification("No se encontraron datos para los filtros seleccionados.", "info");
      } else {
        addNotification(`Reporte de ${reportCollections[reportType].name} generado.`, "success");
      }
    } catch (error) {
      console.error("Error al generar reporte:", error);
      addNotification("Error al generar el reporte: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Panel de Reportes</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">
        <div>
          <label htmlFor="reportType" className="block text-gray-700 text-sm font-bold mb-2">Tipo de Reporte:</label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {Object.entries(reportCollections).map(([key, value]) => (
              <option key={key} value={key}>{value.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha Inicio:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha Fin:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label htmlFor="locationFilter" className="block text-gray-700 text-sm font-bold mb-2">Ubicación:</label>
          <input
            type="text"
            id="locationFilter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Ej: Invernadero 1"
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="md:col-span-4 flex justify-end items-end">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="overflow-x-auto rounded-lg shadow-md mt-8">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-green-100 border-b border-gray-200">
                {reportCollections[reportType].headers.map((header, index) => (
                  <th key={index} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, rowIndex) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {reportCollections[reportType].fields.map((field, colIndex) => (
                    <td key={`${row.id}-${field}`} className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      {field === 'appliedInputs' ? (
                        <ul className="list-disc list-inside">
                          {row[field] && row[field].map((input, idx) => (
                            <li key={idx}>{input.inputName}: {input.quantity} {input.unit} (Total: ${input.subtotal ? input.subtotal.toFixed(2) : '0.00'})</li>
                          ))}
                        </ul>
                      ) : field === 'plannedInputs' ? (
                        <ul className="list-disc list-inside">
                          {row[field] && row[field].map((input, idx) => (
                            <li key={idx}>{input.inputName}: {input.quantity} {input.unit}</li>
                          ))}
                        </ul>
                      ) : field === 'photoUrl' ? (
                        row[field] ? <a href={row[field]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver Foto</a> : 'N/A'
                      ) : field === 'totalCost' || field === 'amount' ? (
                        `$${parseFloat(row[field]).toFixed(2)}`
                      ) : (
                        <p className="text-gray-900 whitespace-no-wrap">{row[field]}</p>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reportData.length === 0 && loading === false && (
        <p className="text-center text-gray-500 py-8">Utiliza los filtros para generar un reporte.</p>
      )}
    </div>
  );
};


// Componente para la Gestión de Usuarios
const UserManagement = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('basic');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState('');
  const [editingUserActiveStatus, setEditingUserActiveStatus] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);

      const unsubscribe = onSnapshot(usersColRef, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData.filter(user => user.id !== userId));
      }, (error) => {
        console.error("Error al obtener la lista de usuarios:", error);
        addNotification("Error al cargar usuarios.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      addNotification("El email del usuario no puede estar vacío.", "warning");
      return;
    }
    const newUid = `user_${Math.random().toString(36).substring(2, 10)}`;

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, newUid);
      await setDoc(userDocRef, {
        email: newUserEmail.trim(),
        role: newUserRole,
        isActive: true,
        createdAt: new Date(),
        createdBy: userId,
      });
      addNotification(`Usuario añadido exitosamente. Su ID es: ${newUid}`, "success");
      setNewUserEmail('');
      setNewUserRole('basic');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir usuario:", error);
      addNotification("Error al añadir usuario.", "error");
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setEditingUserRole(user.role);
    setEditingUserActiveStatus(user.isActive);
  };

  const handleSaveUser = async (userToUpdateId) => {
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userToUpdateId);
      await updateDoc(userDocRef, {
        role: editingUserRole,
        isActive: editingUserActiveStatus,
        updatedAt: new Date(),
        updatedBy: userId,
      });
      addNotification("Usuario actualizado exitosamente.", "success");
      setEditingUserId(null);
      setEditingUserRole('');
      setEditingUserActiveStatus(true);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      addNotification("Error al actualizar usuario.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserRole('');
    setEditingUserActiveStatus(true);
  };

  const handleArchiveUser = async (userToArchiveId, currentStatus) => {
    const action = currentStatus ? "archivar" : "activar";
    if (!window.confirm(`¿Estás seguro de que quieres ${action} este usuario?`)) {
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userToArchiveId);
      await updateDoc(userDocRef, {
        isActive: !currentStatus,
        archivedAt: currentStatus ? new Date() : null,
        archivedBy: currentStatus ? userId : null,
        activatedAt: currentStatus ? null : new Date(),
        activatedBy: currentStatus ? null : userId,
      });
      addNotification(`Usuario ${currentStatus ? 'archivado' : 'activado'} exitosamente.`, "success");
    } catch (error) {
      console.error(`Error al ${action} usuario:`, error);
      addNotification(`Error al ${action} usuario.`, "error");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-xl my-8 border border-gray-200 rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">Gestión de Usuarios</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nuevo Usuario
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddUser} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">Nuevo Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="newUserEmail" className="block text-gray-700 text-sm font-bold mb-2">Email (Opcional):</label>
              <input
                type="email"
                id="newUserEmail"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="ej: usuario@ejemplo.com"
              />
              <p className="text-xs text-gray-500 mt-1">Si no se especifica, se usará un ID generado.</p>
            </div>
            <div>
              <label htmlFor="newUserRole" className="block text-gray-700 text-sm font-bold mb-2">Rol:</label>
              <select
                id="newUserRole"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                required
              >
                <option value="basic">Operario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Crear Usuario
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-gray-700 mb-4">Usuarios Registrados</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-green-100 border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID de Usuario</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rol</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No hay usuarios registrados (excepto el actual administrador).
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{user.id}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{user.email || 'N/A'}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingUserId === user.id ? (
                      <select
                        value={editingUserRole}
                        onChange={(e) => setEditingUserRole(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-xs"
                      >
                        <option value="basic">Operario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 whitespace-no-wrap capitalize">{user.role}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingUserId === user.id ? (
                      <select
                        value={editingUserActiveStatus}
                        onChange={(e) => setEditingUserActiveStatus(e.target.value === 'true')}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 text-xs"
                      >
                        <option value={true}>Activo</option>
                        <option value={false}>Archivado</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.isActive ? 'Activo' : 'Archivado'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {editingUserId === user.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveUser(user.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveUser(user.id, user.isActive)}
                          className={`font-bold py-1 px-3 rounded-md text-xs transition duration-300 ${user.isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        >
                          {user.isActive ? 'Archivar' : 'Activar'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// Componente de prueba para usuarios básicos (mantengo el original para la navegación)
const BasicUserDashboard = () => {
  const { userId, userRole, auth, addNotification } = useContext(AppContext);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      addNotification("Sesión cerrada exitosamente.", "info");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      addNotification("Error al cerrar sesión.", "error");
    }
  };

  if (userRole !== 'basic') {
    return (
      <div className="p-6 text-center text-red-500">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 text-center bg-white shadow-xl rounded-lg mt-10 border border-gray-200 rounded-xl">
      <h2 className="text-4xl font-extrabold text-green-700 mb-6">¡Bienvenido, Operario!</h2>
      <p className="text-xl text-gray-700 mb-8">
        Tu ID de usuario es: <span className="font-mono bg-gray-100 px-3 py-1 rounded-md text-gray-800">{userId}</span>
      </p>
      <p className="text-lg text-gray-600 mb-10">
        Aquí podrás ver un resumen. Dirígete a "Mis Actividades" para ver tus tareas asignadas.
      </p>
      <button
        onClick={handleSignOut}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
      >
        Cerrar Sesión
      </button>
    </div>
  );
};


// Componente principal de la aplicación
function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setNotifications((prevNotifications) => [...prevNotifications, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== id)
    );
  }, []);

  useEffect(() => {
    const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);

    setDb(firestore);
    setAuth(firebaseAuth);

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
        const userDocRef = doc(firestore, `artifacts/${appId}/public/data/users`, user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'basic');
          } else {
            setUserRole('basic');
            await setDoc(userDocRef, {
              email: user.email || `user_${user.uid.substring(0, 8)}@example.com`,
              role: 'basic',
              createdAt: new Date(),
              isActive: true,
              lastLoginAt: new Date(),
            });
          }
        } catch (error) {
          console.error("Error al obtener el rol del usuario:", error);
          setUserRole('basic');
          addNotification("Error al cargar el rol del usuario. Asignado como operario básico.", "error");
        }
      } else {
        setUserId(null);
        setUserRole(null);
      }
      setIsAuthReady(true);
    });

    const handleInitialAuth = async () => {
      if (firebaseAuth && !firebaseAuth.currentUser) {
        const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN;
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
            addNotification("Sesión iniciada con token personalizado.", "info");
          } else {
            await signInAnonymously(firebaseAuth);
            addNotification("Sesión iniciada anónimamente.", "info");
          }
        } catch (error) {
          console.error("Error de autenticación inicial:", error);
          addNotification("Error de autenticación. Inténtalo de nuevo.", "error");
        }
      }
    };

    handleInitialAuth();

    return () => unsubscribe();
  }, [addNotification, dismissNotification]);

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        addNotification("Sesión cerrada exitosamente.", "info");
        setCurrentPage('dashboard');
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        addNotification("Error al cerrar sesión.", "error");
      }
    }
  };

  const renderContent = () => {
    if (!isAuthReady) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-center text-gray-600 text-lg font-semibold animate-pulse">Cargando aplicación...</div>
        </div>
      );
    }

    if (!userId) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl xl:w-1/3 md:w-1/2 w-full text-center max-w-md">
            <h1 className="text-4xl font-extrabold text-green-800 mb-6">
              🍓 Gestión de Fresa Hidropónica
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              Inicia sesión para gestionar tu producción.
            </p>
            <button
              onClick={() => {
                const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN;
                if (initialAuthToken) {
                  signInWithCustomToken(auth, initialAuthToken)
                    .then(() => addNotification("Intentando iniciar sesión...", "info"))
                    .catch((error) => {
                      console.error("Error al iniciar sesión con token:", error);
                      addNotification("Error al iniciar sesión con token. " + error.message, "error");
                    });
                } else {
                  signInAnonymously(auth)
                    .then(() => addNotification("Intentando iniciar sesión anónimamente...", "info"))
                    .catch((error) => {
                      console.error("Error al iniciar sesión anónimamente:", error);
                      addNotification("Error al iniciar sesión anónimamente. " + error.message, "error");
                    });
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-gray-100 font-inter">
        <header className="bg-white shadow-md p-4 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-green-800">🍓 FresaTech</h1>
            <span className="ml-4 text-sm text-gray-600">ID Usuario: <span className="font-mono text-gray-800">{userId}</span></span>
          </div>
          <nav className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-4 py-2 rounded-md transition duration-300 ${currentPage === 'dashboard' ? 'bg-green-100 text-green-800 font-semibold shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Inicio
            </button>
            {userRole === 'admin' && (
              <>
                <div className="relative group">
                  <button className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition duration-300">
                    Registros
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible">
                    <button
                      onClick={() => setCurrentPage('production-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Registrar Producción
                    </button>
                    <button
                      onClick={() => setCurrentPage('input-application-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Aplicación Insumos
                    </button>
                    <button
                      onClick={() => setCurrentPage('labor-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Registrar Labor
                    </button>
                    <button
                      onClick={() => setCurrentPage('report-disease-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Reportar Enfermedad
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <button className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition duration-300">
                    Planificación
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible">
                    <button
                      onClick={() => setCurrentPage('task-assignment-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Asignar Tarea
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <button className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition duration-300">
                    Administración
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible">
                    <button
                      onClick={() => setCurrentPage('admin-inputs')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Catálogo Insumos
                    </button>
                    <button
                      onClick={() => setCurrentPage('admin-products')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Catálogo Productos
                    </button>
                    <button
                      onClick={() => setCurrentPage('admin-labor-types')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Tipos de Labores
                    </button>
                    <button
                      onClick={() => setCurrentPage('admin-diseases')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Catálogo Enfermedades
                    </button>
                    <button
                      onClick={() => setCurrentPage('admin-nutrient-recipes')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Recetas Nutrientes
                    </button>
                    <button
                      onClick={() => setCurrentPage('admin-locations')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Gestión Ubicaciones
                    </button>
                    <button
                      onClick={() => setCurrentPage('admin-users')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Gestión Usuarios
                    </button>
                    <button
                      onClick={() => setCurrentPage('reports-dashboard')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Reportes
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <button className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition duration-300">
                    Ayuda
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible">
                    <button
                      onClick={() => setCurrentPage('nutrient-calculator')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Calc. Mezcla Nutrientes
                    </button>
                  </div>
                </div>
              </>
            )}
            {userRole === 'basic' && (
              <>
                <button
                  onClick={() => setCurrentPage('my-activities')}
                  className={`ml-2 px-4 py-2 rounded-md transition duration-300 ${currentPage === 'my-activities' ? 'bg-green-100 text-green-800 font-semibold shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Mis Actividades
                </button>
                <div className="relative group">
                  <button className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition duration-300">
                    Registros Rápidos
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible">
                    <button
                      onClick={() => setCurrentPage('production-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Registrar Producción
                    </button>
                    <button
                      onClick={() => setCurrentPage('input-application-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Aplicación Insumos
                    </button>
                    <button
                      onClick={() => setCurrentPage('labor-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Registrar Labor
                    </button>
                    <button
                      onClick={() => setCurrentPage('report-disease-form')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Reportar Enfermedad
                    </button>
                     <button
                      onClick={() => setCurrentPage('nutrient-calculator')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Calc. Mezcla Nutrientes
                    </button>
                  </div>
                </div>
              </>
            )}
            <button
              onClick={handleLogout}
              className="ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cerrar Sesión
            </button>
          </nav>
        </header>

        <main className="flex-grow p-4">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white rounded-lg shadow-xl">
            <NotificationCenter />
            {currentPage === 'dashboard' && (
              <div className="p-6 text-center">
                <h2 className="text-3xl font-semibold text-gray-800 mb-4">Dashboard Principal</h2>
                <p className="text-gray-600">Bienvenido al sistema de gestión de fresas.</p>
                {userRole === 'admin' && (
                  <p className="text-gray-700 font-medium mt-2">Tienes acceso como <span className="text-green-600">Administrador</span>.</p>
                )}
                {userRole === 'basic' && (
                  <p className="text-gray-700 font-medium mt-2">Tienes acceso como <span className="text-blue-600">Operario</span>.</p>
                )}
                <p className="text-gray-500 text-sm mt-4">
                  Selecciona una opción del menú de navegación para comenzar.
                </p>
              </div>
            )}

            {currentPage === 'admin-inputs' && <InputCatalog />}
            {currentPage === 'admin-products' && <ProductCatalog />}
            {currentPage === 'admin-labor-types' && <LaborTypeCatalog />}
            {currentPage === 'admin-diseases' && <DiseaseCatalog />}
            {currentPage === 'admin-nutrient-recipes' && <NutrientRecipeCatalog />}
            {currentPage === 'reports-dashboard' && <ReportsDashboard />}
            {currentPage === 'admin-users' && <UserManagement />}
            {currentPage === 'admin-locations' && <LocationCatalog />}

            {currentPage === 'production-form' && <ProductionForm />}
            {currentPage === 'input-application-form' && <InputApplicationForm />}
            {currentPage === 'labor-form' && <LaborForm />}
            {currentPage === 'report-disease-form' && <ReportDiseaseForm />}

            {currentPage === 'task-assignment-form' && <TaskAssignmentForm />}

            {currentPage === 'nutrient-calculator' && <NutrientMixCalculatorForm />}

            {currentPage === 'my-activities' && <MyActivities />}

          </div>
        </main>

        <footer className="bg-gray-800 text-white text-center p-4">
          <p>&copy; {new Date().getFullYear()} FresaTech. Todos los derechos reservados.</p>
        </footer>
      </div>
    );
  };

  return (
    <AppContext.Provider value={{ db, auth, userId, userRole, isAuthReady, addNotification, dismissNotification, notifications }}>
      {renderContent()}
    </AppContext.Provider>
  );
}

export default App;

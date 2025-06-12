import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


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
          className={`flex items-center justify-between p-4 rounded-lg shadow-xl animate-fade-in-down
            ${notification.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-600 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-600 text-white' : ''}
            ${!notification.type ? 'bg-gray-700 text-white' : ''}
          `}
          style={{ minWidth: '280px', maxWidth: '400px' }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => dismissNotification(notification.id)}
            className="ml-4 text-white hover:text-gray-100 focus:outline-none transition-transform transform hover:scale-110"
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


// Hook para cargar las unidades de medida
const useUnits = () => {
  const { db, isAuthReady, addNotification } = useContext(AppContext);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const unitsColRef = collection(db, `artifacts/${appId}/public/data/units`);
      const q = query(unitsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUnits(unitsData);
      }, (error) => {
        console.error("Error al obtener unidades:", error);
        addNotification("Error al cargar unidades de medida.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  return units;
};


// Hook para cargar los tipos de insumo
const useInputTypes = () => {
  const { db, isAuthReady, addNotification } = useContext(AppContext);
  const [inputTypes, setInputTypes] = useState([]);

  useEffect(() => {
    if (db && isAuthReady) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const typesColRef = collection(db, `artifacts/${appId}/public/data/input_types`);
      const q = query(typesColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const typesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInputTypes(typesData);
      }, (error) => {
        console.error("Error al obtener tipos de insumo:", error);
        addNotification("Error al cargar los tipos de insumo.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady, addNotification]);

  return inputTypes;
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

// **NUEVO** Componente de Formulario para Insumos
const InputAddEditForm = ({
  isEditing,
  data,
  changeHandler,
  componentChangeHandler,
  submitHandler,
  cancelHandler,
  addActiveComponentRow,
  removeActiveComponentRow,
  units,
  inputTypes
}) => {
  return (
    <form onSubmit={submitHandler} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
      <h3 className="text-2xl font-semibold text-emerald-300 mb-4">{isEditing ? "Editar Insumo" : "Nuevo Insumo"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* El campo de nombre solo se muestra si no se está editando */}
        {!isEditing && (
          <div>
            <label className="block text-gray-200 text-sm font-bold mb-2">Nombre:</label>
            <input type="text" name="name" value={data.name} onChange={changeHandler} className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" required />
          </div>
        )}
        {/* Si se está editando, mostramos el nombre como texto no editable pero ocupando el espacio */}
        {isEditing && (
             <div className="md:col-span-1">
                <label className="block text-gray-200 text-sm font-bold mb-2">Nombre:</label>
                <p className="shadow appearance-none border rounded-md w-full py-2 px-3 bg-gray-600 text-white font-semibold">{data.name}</p>
            </div>
        )}
         <div>
            <label className="block text-gray-200 text-sm font-bold mb-2">Tipo de Insumo:</label>
            <select name="inputTypeId" value={data.inputTypeId} onChange={changeHandler} className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" required>
                <option value="">Selecciona un tipo</option>
                {inputTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
        </div>
        <div>
            <label className="block text-gray-200 text-sm font-bold mb-2">Unidad:</label>
            <select name="unitId" value={data.unitId} onChange={changeHandler} className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" required>
                <option value="">Selecciona una unidad</option>
                {units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>)}
            </select>
        </div>
        <div>
            <label className="block text-gray-200 text-sm font-bold mb-2">Precio ($):</label>
            <input type="number" step="0.01" name="price" value={data.price} onChange={changeHandler} className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" required />
        </div>
      </div>

      <h4 className="text-xl font-semibold text-emerald-300 mb-3">Componentes Activos</h4>
      {data.activeComponents && data.activeComponents.map((component, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-3 border border-gray-600 rounded-md bg-gray-800">
          <input type="text" name="name" value={component.name} onChange={(e) => componentChangeHandler(index, e)} placeholder="Nombre Componente" className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-800 bg-gray-700 text-white" required />
          <input type="number" step="0.01" name="percentage" value={component.percentage} onChange={(e) => componentChangeHandler(index, e)} placeholder="Porcentaje (%)" className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-800 bg-gray-700 text-white" required />
          <div className="flex items-center">
            {data.activeComponents.length > 1 && (
              <button type="button" onClick={() => removeActiveComponentRow(index, isEditing)} className="bg-red-500 text-white font-bold py-1 px-2 rounded-full text-xs">Remover</button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => addActiveComponentRow(isEditing)} className="bg-blue-500 text-white font-bold py-1 px-3 rounded-full text-sm mt-2">Añadir Componente</button>

      <div className="flex justify-end gap-2 mt-6">
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow">Guardar</button>
        <button type="button" onClick={cancelHandler} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow">Cancelar</button>
      </div>
    </form>
  );
};

// **NUEVO** Componente de Formulario para Productos
const ProductAddEditForm = ({
  isEditing,
  data,
  changeHandler,
  submitHandler,
  cancelHandler,
  units
}) => {
  return (
    <form onSubmit={submitHandler} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
      <h3 className="text-2xl font-semibold text-emerald-300 mb-4">{isEditing ? "Editar Producto" : "Nuevo Producto"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* El campo de nombre solo se muestra si no se está editando */}
        {!isEditing && (
          <div>
            <label className="block text-gray-200 text-sm font-bold mb-2">Nombre:</label>
            <input type="text" name="name" value={data.name} onChange={changeHandler} className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" required />
          </div>
        )}
        {/* Si se está editando, mostramos el nombre como texto no editable pero ocupando el espacio */}
        {isEditing && (
             <div className="md:col-span-1">
                <label className="block text-gray-200 text-sm font-bold mb-2">Nombre:</label>
                <p className="shadow appearance-none border rounded-md w-full py-2 px-3 bg-gray-600 text-white font-semibold">{data.name}</p>
            </div>
        )}
        <div className={isEditing ? 'md:col-span-1' : ''}>
          <label className="block text-gray-200 text-sm font-bold mb-2">Unidad de Venta:</label>
          <select name="unitId" value={data.unitId} onChange={changeHandler} className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" required>
            <option value="">Selecciona una unidad</option>
            {units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-200 text-sm font-bold mb-2">Precio ($):</label>
          <input type="number" step="0.01" name="price" value={data.price} onChange={changeHandler} className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" required />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow">Guardar</button>
        <button type="button" onClick={cancelHandler} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow">Cancelar</button>
      </div>
    </form>
  );
};

// Componente para la gestión de Unidades de Medida
const UnitCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [units, setUnits] = useState([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbreviation, setNewUnitAbbreviation] = useState('');
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editingUnitName, setEditingUnitName] = useState('');
  const [editingUnitAbbreviation, setEditingUnitAbbreviation] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const unitsColRef = collection(db, `artifacts/${appId}/public/data/units`);
      const q = query(unitsColRef, where('isActive', '==', true));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUnits(unitsData);
      }, (error) => {
        console.error("Error al obtener el catálogo de unidades:", error);
        addNotification("Error al cargar unidades.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName.trim() || !newUnitAbbreviation.trim()) {
      addNotification("El nombre y la abreviatura no pueden estar vacíos.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/units`), {
        name: newUnitName.trim(),
        abbreviation: newUnitAbbreviation.trim(),
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Unidad añadida exitosamente.", "success");
      setNewUnitName('');
      setNewUnitAbbreviation('');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir unidad:", error);
      addNotification("Error al añadir unidad.", "error");
    }
  };

  const handleEditUnit = (unit) => {
    setEditingUnitId(unit.id);
    setEditingUnitName(unit.name);
    setEditingUnitAbbreviation(unit.abbreviation);
  };

  const handleSaveUnit = async (unitId) => {
    if (!editingUnitName.trim() || !editingUnitAbbreviation.trim()) {
      addNotification("El nombre y la abreviatura no pueden estar vacíos.", "warning");
      return;
    }
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const unitDocRef = doc(db, `artifacts/${appId}/public/data/units`, unitId);
      await updateDoc(unitDocRef, {
        name: editingUnitName.trim(),
        abbreviation: editingUnitAbbreviation.trim(),
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Unidad actualizada exitosamente.", "success");
      setEditingUnitId(null);
    } catch (error) {
      console.error("Error al actualizar unidad:", error);
      addNotification("Error al actualizar unidad.", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingUnitId(null);
    setEditingUnitName('');
    setEditingUnitAbbreviation('');
  };

  const handleArchiveUnit = async (unitId) => {
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const unitDocRef = doc(db, `artifacts/${appId}/public/data/units`, unitId);
      await updateDoc(unitDocRef, {
        isActive: false,
        archivedAt: new Date(),
        archivedBy: userId
      });
      addNotification("Unidad archivada exitosamente.", "success");
    } catch (error) {
      console.error("Error al archivar unidad:", error);
      addNotification("Error al archivar unidad.", "error");
    }
  };

  if (userRole !== 'admin') return <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">No tienes permisos.</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Unidades de Medida</h2>
      {!showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6">
          Añadir Nueva Unidad
        </button>
      )}
      {showAddForm && (
        <form onSubmit={handleAddUnit} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Nueva Unidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="newUnitName" className="block text-gray-200 text-sm font-bold mb-2">Nombre (Ej: Litro):</label>
              <input type="text" id="newUnitName" className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-600 text-white" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="newUnitAbbreviation" className="block text-gray-200 text-sm font-bold mb-2">Abreviatura (Ej: L):</label>
              <input type="text" id="newUnitAbbreviation" className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-600 text-white" value={newUnitAbbreviation} onChange={(e) => setNewUnitAbbreviation(e.target.value)} required />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105">Guardar</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105">Cancelar</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead><tr className="bg-gray-700 border-b border-gray-600"><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Abreviatura</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th></tr></thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-700">
                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">{editingUnitId === unit.id ? <input type="text" value={editingUnitName} onChange={(e) => setEditingUnitName(e.target.value)} className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 bg-gray-600 text-white" /> : <p className="text-gray-100">{unit.name}</p>}</td>
                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">{editingUnitId === unit.id ? <input type="text" value={editingUnitAbbreviation} onChange={(e) => setEditingUnitAbbreviation(e.target.value)} className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 bg-gray-600 text-white" /> : <p className="text-gray-100">{unit.abbreviation}</p>}</td>
                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                  {editingUnitId === unit.id ? (
                    <div className="flex gap-2"><button onClick={() => handleSaveUnit(unit.id)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-xs">Guardar</button><button onClick={handleCancelEdit} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-full text-xs">Cancelar</button></div>
                  ) : (
                    <div className="flex gap-2"><button onClick={() => handleEditUnit(unit)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-full text-xs">Editar</button><button onClick={() => handleArchiveUnit(unit.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-xs">Archivar</button></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// Componente para la gestión de Tipos de Insumo
const InputTypeCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [types, setTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (db && isAuthReady && userRole === 'admin') {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const typesColRef = collection(db, `artifacts/${appId}/public/data/input_types`);
      const q = query(typesColRef, where('isActive', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error al obtener tipos de insumo:", error);
        addNotification("Error al cargar tipos de insumo.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  const handleAddType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return addNotification("El nombre no puede estar vacío.", "warning");
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/input_types`), {
        name: newTypeName.trim(),
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Tipo de insumo añadido.", "success");
      setNewTypeName('');
      setShowAddForm(false);
    } catch (error) {
      addNotification("Error al añadir tipo de insumo.", "error");
    }
  };

  const handleEditType = (type) => {
    setEditingTypeId(type.id);
    setEditingTypeName(type.name);
  };

  const handleSaveType = async (typeId) => {
    if (!editingTypeName.trim()) return addNotification("El nombre no puede estar vacío.", "warning");
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const typeDocRef = doc(db, `artifacts/${appId}/public/data/input_types`, typeId);
      await updateDoc(typeDocRef, { name: editingTypeName.trim(), updatedAt: new Date(), updatedBy: userId });
      addNotification("Tipo de insumo actualizado.", "success");
      setEditingTypeId(null);
    } catch (error) {
      addNotification("Error al actualizar tipo de insumo.", "error");
    }
  };

  const handleCancelEdit = () => setEditingTypeId(null);

  const handleArchiveType = async (typeId) => {
    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const typeDocRef = doc(db, `artifacts/${appId}/public/data/input_types`, typeId);
      await updateDoc(typeDocRef, { isActive: false, archivedAt: new Date(), archivedBy: userId });
      addNotification("Tipo de insumo archivado.", "success");
    } catch (error) {
      addNotification("Error al archivar.", "error");
    }
  };

  if (userRole !== 'admin') return <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">No tienes permisos.</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Tipos de Insumo</h2>
      {!showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6">Añadir Nuevo Tipo</button>
      )}
      {showAddForm && (
        <form onSubmit={handleAddType} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Nuevo Tipo de Insumo</h3>
          <div>
            <label htmlFor="newTypeName" className="block text-gray-200 text-sm font-bold mb-2">Nombre (Ej: Fungicida):</label>
            <input type="text" id="newTypeName" className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 bg-gray-600 text-white" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow">Guardar</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow">Cancelar</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead><tr className="bg-gray-700 border-b border-gray-600"><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th></tr></thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-gray-700">
                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">{editingTypeId === type.id ? <input type="text" value={editingTypeName} onChange={(e) => setEditingTypeName(e.target.value)} className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 bg-gray-600 text-white" /> : <p className="text-gray-100">{type.name}</p>}</td>
                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                  {editingTypeId === type.id ? (
                    <div className="flex gap-2"><button onClick={() => handleSaveType(type.id)} className="bg-blue-500 text-white font-bold py-1 px-3 rounded-full text-xs">Guardar</button><button onClick={handleCancelEdit} className="bg-gray-500 text-white font-bold py-1 px-3 rounded-full text-xs">Cancelar</button></div>
                  ) : (
                    <div className="flex gap-2"><button onClick={() => handleEditType(type)} className="bg-yellow-500 text-white font-bold py-1 px-3 rounded-full text-xs">Editar</button><button onClick={() => handleArchiveType(type.id)} className="bg-red-500 text-white font-bold py-1 px-3 rounded-full text-xs">Archivar</button></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};



// Componente para la gestión de ubicaciones (invernaderos)
const LocationCatalog = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [locations, setLocations] = useState([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [editingLocationId, setEditingLocationId] = useState(null); // Corrected initialization
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
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Ubicaciones</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nueva Ubicación
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddLocation} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Nueva Ubicación</h3>
          <div className="mb-4">
            <label htmlFor="newLocationName" className="block text-gray-200 text-sm font-bold mb-2">Nombre:</label>
            <input
              type="text"
              id="newLocationName"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-600 text-white"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Ubicación
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Ubicaciones Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-700 border-b border-gray-600">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan="2" className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm text-gray-300 text-center">
                  No hay ubicaciones registradas.
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-700">
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingLocationId === loc.id ? (
                      <input
                        type="text"
                        value={editingLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                      />
                    ) : (
                      <p className="text-gray-100 whitespace-no-wrap">{loc.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingLocationId === loc.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveLocation(loc.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditLocation(loc.id, loc.name)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveLocation(loc.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
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

// Componente para la gestión de catálogo de insumos (CORREGIDO)
const InputCatalog = () => {
    const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
    const units = useUnits();
    const inputTypes = useInputTypes();

    const [inputs, setInputs] = useState([]);
    const [newInputData, setNewInputData] = useState({
        name: '', unitId: '', price: '', inputTypeId: '', activeComponents: [{ name: '', percentage: '' }]
    });
    const [editingInput, setEditingInput] = useState(null);
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
                addNotification("Error al cargar insumos.", "error");
            });
            return () => unsubscribe();
        }
    }, [db, isAuthReady, userRole, addNotification]);

    const handleNewInputChange = (e) => {
        const { name, value } = e.target;
        setNewInputData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditingInputChange = (e) => {
        const { name, value } = e.target;
        setEditingInput(prev => ({ ...prev, [name]: value }));
    };
    
    const handleActiveComponentChange = (index, e, isEditing = false) => {
        const { name, value } = e.target;
        const target = isEditing ? editingInput : newInputData;
        const setter = isEditing ? setEditingInput : setNewInputData;
        const updatedComponents = [...(target.activeComponents || [])];
        updatedComponents[index] = { ...updatedComponents[index], [name]: value };
        setter(prev => ({ ...prev, activeComponents: updatedComponents }));
    };

    const addActiveComponentRow = (isEditing = false) => {
        const newRow = { name: '', percentage: '' };
        const setter = isEditing ? setEditingInput : setNewInputData;
        setter(prev => ({ ...prev, activeComponents: [...(prev.activeComponents || []), newRow] }));
    };
    
    const removeActiveComponentRow = (index, isEditing = false) => {
        const target = isEditing ? editingInput : newInputData;
        const setter = isEditing ? setEditingInput : setNewInputData;
        if (!target.activeComponents || target.activeComponents.length <= 1) return;
        setter(prev => ({ ...prev, activeComponents: prev.activeComponents.filter((_, i) => i !== index) }));
    };

    const resetAddForm = () => {
        setNewInputData({ name: '', unitId: '', price: '', inputTypeId: '', activeComponents: [{ name: '', percentage: '' }] });
        setShowAddForm(false);
    };

    const handleAddInput = async (e) => {
        e.preventDefault();
        const { name, unitId, price, inputTypeId, activeComponents } = newInputData;
        if (!name || !unitId || !price || !inputTypeId) return addNotification("Rellena todos los campos principales.", "warning");
        if (activeComponents.some(c => !c.name.trim() || !c.percentage)) return addNotification("Completa todos los componentes activos.", "warning");
        
        const selectedUnit = units.find(u => u.id === unitId);
        const selectedType = inputTypes.find(t => t.id === inputTypeId);
        if (!selectedUnit || !selectedType) return addNotification("Unidad o tipo no válidos.", "error");

        try {
            const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
            await addDoc(collection(db, `artifacts/${appId}/public/data/input_catalog`), {
                name: name.trim(), unitId, unitName: selectedUnit.name, unitAbbreviation: selectedUnit.abbreviation,
                inputTypeId, inputTypeName: selectedType.name, price: parseFloat(price),
                activeComponents: activeComponents.map(c => ({ name: c.name.trim(), percentage: parseFloat(c.percentage) })),
                isActive: true, createdAt: new Date(), createdBy: userId
            });
            addNotification("Insumo añadido.", "success");
            resetAddForm();
        } catch (error) {
            addNotification("Error al añadir insumo.", "error");
        }
    };
    
    const handleEditInput = (input) => {
      setEditingInput({ ...input, activeComponents: input.activeComponents || [{ name: '', percentage: '' }] });
    };

    const handleSaveInput = async (e) => {
        e.preventDefault();
        const { id, unitId, inputTypeId, price, activeComponents } = editingInput;
        if (!unitId || !inputTypeId || !price) return addNotification("Rellena los campos principales.", "warning");

        const selectedUnit = units.find(u => u.id === unitId);
        const selectedType = inputTypes.find(t => t.id === inputTypeId);
        if (!selectedUnit || !selectedType) return addNotification("Unidad o tipo no válidos.", "error");

        try {
            const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
            const inputDocRef = doc(db, `artifacts/${appId}/public/data/input_catalog`, id);
            await updateDoc(inputDocRef, {
                unitId, unitName: selectedUnit.name, unitAbbreviation: selectedUnit.abbreviation,
                inputTypeId, inputTypeName: selectedType.name, price: parseFloat(price),
                activeComponents: activeComponents.map(c => ({ name: c.name.trim(), percentage: parseFloat(c.percentage) })),
                updatedAt: new Date(), updatedBy: userId
            });
            addNotification("Insumo actualizado.", "success");
            setEditingInput(null);
        } catch (error) {
            addNotification("Error al actualizar insumo.", "error");
        }
    };

    const handleCancelEdit = () => setEditingInput(null);

    const handleArchiveInput = async (inputId) => {
        try {
            const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
            const inputDocRef = doc(db, `artifacts/${appId}/public/data/input_catalog`, inputId);
            await updateDoc(inputDocRef, { isActive: false, archivedAt: new Date(), archivedBy: userId });
            addNotification("Insumo archivado.", "success");
        } catch (error) {
            addNotification("Error al archivar insumo.", "error");
        }
    };

    if (userRole !== 'admin') return <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">No tienes permisos.</div>;
    
    return (
        <div className="container mx-auto p-4 max-w-5xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Insumos</h2>

            {!showAddForm && !editingInput && (
                <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6">
                    Añadir Nuevo Insumo
                </button>
            )}

            {showAddForm && <InputAddEditForm isEditing={false} data={newInputData} changeHandler={handleNewInputChange} componentChangeHandler={(index, e) => handleActiveComponentChange(index, e, false)} submitHandler={handleAddInput} cancelHandler={resetAddForm} addActiveComponentRow={(isEditing) => addActiveComponentRow(isEditing)} removeActiveComponentRow={(index, isEditing) => removeActiveComponentRow(index, isEditing)} units={units} inputTypes={inputTypes} />}
            {editingInput && <InputAddEditForm isEditing={true} data={editingInput} changeHandler={handleEditingInputChange} componentChangeHandler={(index, e) => handleActiveComponentChange(index, e, true)} submitHandler={handleSaveInput} cancelHandler={handleCancelEdit} addActiveComponentRow={(isEditing) => addActiveComponentRow(isEditing)} removeActiveComponentRow={(index, isEditing) => removeActiveComponentRow(index, isEditing)} units={units} inputTypes={inputTypes} />}

            <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Insumos Existentes</h3>
            <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full leading-normal">
                    <thead><tr className="bg-gray-700 border-b border-gray-600"><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Tipo</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Unidad</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Precio</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Componentes</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th></tr></thead>
                    <tbody>
                        {inputs.map((input) => (
                            <tr key={input.id} className="hover:bg-gray-700">
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm"><p className="text-gray-100">{input.name}</p></td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm"><p className="text-gray-100">{input.inputTypeName}</p></td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm"><p className="text-gray-100">{input.unitAbbreviation}</p></td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm"><p className="text-gray-100">${input.price ? input.price.toFixed(2) : '0.00'}</p></td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                                    {input.activeComponents && input.activeComponents.length > 0 ? (
                                      <ul className="list-disc list-inside text-gray-100 text-xs">
                                          {input.activeComponents.map((c, i) => <li key={i}>{c.name}: {c.percentage}%</li>)}
                                      </ul>
                                    ) : ( <p className="text-gray-400 text-xs">N/A</p> )}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditInput(input)} className="bg-yellow-500 text-white font-bold py-1 px-3 rounded-full text-xs">Editar</button>
                                        <button onClick={() => handleArchiveInput(input.id)} className="bg-red-500 text-white font-bold py-1 px-3 rounded-full text-xs">Archivar</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// Componente para la gestión de catálogo de productos (CORREGIDO)
const ProductCatalog = () => {
    const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
    const units = useUnits();

    const [products, setProducts] = useState([]);
    const [newProductData, setNewProductData] = useState({ name: '', unitId: '', price: '' });
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        if (db && isAuthReady && userRole === 'admin') {
            const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
            const productsColRef = collection(db, `artifacts/${appId}/public/data/product_catalog`);
            const q = query(productsColRef, where('isActive', '==', true));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => {
                addNotification("Error al cargar productos.", "error");
            });
            return () => unsubscribe();
        }
    }, [db, isAuthReady, userRole, addNotification]);
    
    const handleNewInputChange = (e) => {
      const { name, value } = e.target;
      setNewProductData(prev => ({ ...prev, [name]: value}));
    };

    const handleEditingInputChange = (e) => {
        const { name, value } = e.target;
        setEditingProduct(prev => ({ ...prev, [name]: value }));
    };

    const resetAddForm = () => {
        setNewProductData({ name: '', unitId: '', price: '' });
        setShowAddForm(false);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const { name, unitId, price } = newProductData;
        if (!name || !unitId || !price) return addNotification("Rellena todos los campos.", "warning");

        const selectedUnit = units.find(u => u.id === unitId);
        if (!selectedUnit) return addNotification("Unidad no válida.", "error");

        try {
            const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
            await addDoc(collection(db, `artifacts/${appId}/public/data/product_catalog`), {
                name: name.trim(), unitId, unitName: selectedUnit.name, unitAbbreviation: selectedUnit.abbreviation,
                price: parseFloat(price), isActive: true, createdAt: new Date(), createdBy: userId
            });
            addNotification("Producto añadido.", "success");
            resetAddForm();
        } catch (error) {
            addNotification("Error al añadir producto.", "error");
        }
    };

    const handleEditProduct = (product) => {
      setEditingProduct({ ...product });
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const { id, unitId, price } = editingProduct;
        if (!unitId || !price) return addNotification("Rellena los campos.", "warning");
        const selectedUnit = units.find(u => u.id === unitId);
        if (!selectedUnit) return addNotification("Unidad no válida.", "error");

        try {
            const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
            const productDocRef = doc(db, `artifacts/${appId}/public/data/product_catalog`, id);
            await updateDoc(productDocRef, {
                unitId, unitName: selectedUnit.name, unitAbbreviation: selectedUnit.abbreviation,
                price: parseFloat(price), updatedAt: new Date(), updatedBy: userId
            });
            addNotification("Producto actualizado.", "success");
            setEditingProduct(null);
        } catch (error) {
            addNotification("Error al actualizar producto.", "error");
        }
    };
    
    const handleCancelEdit = () => setEditingProduct(null);

    const handleArchiveProduct = async (productId) => {
        try {
            const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
            const productDocRef = doc(db, `artifacts/${appId}/public/data/product_catalog`, productId);
            await updateDoc(productDocRef, { isActive: false, archivedAt: new Date(), archivedBy: userId });
            addNotification("Producto archivado.", "success");
        } catch (error) {
            addNotification("Error al archivar producto.", "error");
        }
    };
    
    if (userRole !== 'admin') return <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">No tienes permisos.</div>;

    return (
        <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Productos</h2>
            {!showAddForm && !editingProduct &&(
                <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg mb-6">Añadir Nuevo Producto</button>
            )}
            
            {showAddForm && <ProductAddEditForm isEditing={false} data={newProductData} changeHandler={handleNewInputChange} submitHandler={handleAddProduct} cancelHandler={resetAddForm} units={units} />}
            {editingProduct && <ProductAddEditForm isEditing={true} data={editingProduct} changeHandler={handleEditingInputChange} submitHandler={handleSaveProduct} cancelHandler={handleCancelEdit} units={units} />}

            <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Productos Existentes</h3>
            <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full leading-normal">
                    <thead><tr className="bg-gray-700 border-b border-gray-600"><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Unidad</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Precio</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th></tr></thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-700">
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm"><p className="text-gray-100">{product.name}</p></td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm"><p className="text-gray-100">{product.unitName}</p></td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm"><p className="text-gray-100">${product.price ? product.price.toFixed(2) : '0.00'}</p></td>
                                <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditProduct(product)} className="bg-yellow-500 text-white font-bold py-1 px-3 rounded-full text-xs">Editar</button>
                                        <button onClick={() => handleArchiveProduct(product.id)} className="bg-red-500 text-white font-bold py-1 px-3 rounded-full text-xs">Archivar</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// Componente para el registro de Producción
const ProductionForm = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const locations = useLocations();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productId: '',
    quantityKg: '',
    locationId: '',
    quality: 'Media'
  });

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
        locationName: selectedLocation.name,
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
    <div className="container mx-auto p-4 max-w-2xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Registrar Producción</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="date" className="block text-gray-200 text-sm font-bold mb-2">Fecha:</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
            required
          />
        </div>
        <div>
          <label htmlFor="productId" className="block text-gray-200 text-sm font-bold mb-2">Producto:</label>
          <select
            id="productId"
            name="productId"
            value={formData.productId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
            required
          >
            <option value="">Selecciona un producto</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quantityKg" className="block text-gray-200 text-sm font-bold mb-2">Cantidad (Kg):</label>
          <input
            type="number"
            step="0.01"
            id="quantityKg"
            name="quantityKg"
            value={formData.quantityKg}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
            required
          />
        </div>
        <div>
          <label htmlFor="locationId" className="block text-gray-200 text-sm font-bold mb-2">Ubicación (Invernadero):</label>
          <select
            id="locationId"
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
            required
          >
            <option value="">Selecciona una ubicación</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quality" className="block text-gray-200 text-sm font-bold mb-2">Calidad:</label>
          <select
            id="quality"
            name="quality"
            value={formData.quality}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
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
    <div className="container mx-auto p-4 max-w-3xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Registrar Aplicación de Insumos</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="inputDate" className="block text-gray-200 text-sm font-bold mb-2">Fecha:</label>
            <input
              type="date"
              id="inputDate"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="locationId" className="block text-gray-200 text-sm font-bold mb-2">Ubicación (Invernadero):</label>
            <select
              id="locationId"
              name="locationId"
              value={formData.locationId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
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
          <label htmlFor="inputObjective" className="block text-gray-200 text-sm font-bold mb-2">Objetivo:</label>
          <textarea
            id="inputObjective"
            name="objective"
            value={formData.objective}
            onChange={handleChange}
            rows="3"
            placeholder="Ej: Mitigar botrytis, fertilización foliar"
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            required
          ></textarea>
        </div>

        <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Insumos Aplicados</h3>
        {formData.appliedInputs.map((item, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-600 rounded-md bg-gray-700">
            <div>
              <label htmlFor={`inputId-${index}`} className="block text-gray-200 text-sm font-bold mb-2">Insumo:</label>
              <select
                id={`inputId-${index}`}
                name="inputId"
                value={item.inputId}
                onChange={(e) => handleInputChange(index, e)}
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                required
              >
                <option value="">Selecciona insumo</option>
                {inputsCatalog.map(input => (
                  <option key={input.id} value={input.id}>{input.name} ({input.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`quantity-${index}`} className="block text-gray-200 text-sm font-bold mb-2">Cantidad:</label>
              <input
                type="number"
                step="0.01"
                id={`quantity-${index}`}
                name="quantity"
                value={item.quantity}
                onChange={(e) => handleInputChange(index, e)}
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                required
              />
            </div>
            <div className="flex items-center pt-2">
              <span className="text-gray-200 text-sm font-bold block mb-2">Unidad:</span>
              <p className="ml-2 text-gray-100">{item.unit || '-'}</p>
            </div>
            <div className="flex items-center pt-2">
              <span className="text-gray-200 text-sm font-bold block mb-2">Costo:</span>
              <p className="ml-2 text-gray-100">${item.subtotal ? item.subtotal.toFixed(2) : '0.00'}</p>
              {formData.appliedInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveInputRow(index)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs"
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
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105 mt-2 mb-6"
        >
          Añadir Otro Insumo
        </button>

        <div className="text-right text-2xl font-bold text-emerald-300 mt-6">
          Costo Total: ${calculateTotalCost().toFixed(2)}
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
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
  const [editingLaborTypeId, setEditingLaborTypeId] = useState(null); // Corrected initialization
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
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Tipos de Labores</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nuevo Tipo de Labor
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddLaborType} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Nuevo Tipo de Labor</h3>
          <div className="mb-4">
            <label htmlFor="newLaborTypeName" className="block text-gray-200 text-sm font-bold mb-2">Nombre:</label>
            <input
              type="text"
              id="newLaborTypeName"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
              value={newLaborTypeName}
              onChange={(e) => setNewLaborTypeName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Tipo de Labor
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Tipos de Labores Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-700 border-b border-gray-600">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {laborTypes.length === 0 ? (
              <tr>
                <td colSpan="2" className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm text-gray-300 text-center">
                  No hay tipos de labor registrados.
                </td>
              </tr>
            ) : (
              laborTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-700">
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingLaborTypeId === type.id ? (
                      <input
                        type="text"
                        value={editingLaborTypeName}
                        onChange={(e) => setEditingLaborTypeName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                      />
                    ) : (
                      <p className="text-gray-100 whitespace-no-wrap">{type.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingLaborTypeId === type.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveLaborType(type.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditLaborType(type.id, type.name)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveLaborType(type.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
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
  const [newDiseaseSymptoms, setNewDiseaseSymptoms] = useState('');
  const [newDiseaseIndications, setNewDiseaseIndications] = useState('');
  const [newDiseasePhotoFiles, setNewDiseasePhotoFiles] = useState([]); // Array para múltiples archivos
  const [newDiseasePhotoPreviewUrls, setNewDiseasePhotoPreviewUrls] = useState([]); // Array para previsualizaciones

  const [editingDiseaseId, setEditingDiseaseId] = useState(null);
  const [editingDiseaseName, setEditingDiseaseName] = useState('');
  const [editingDiseaseSymptoms, setEditingDiseaseSymptoms] = useState('');
  const [editingDiseaseIndications, setEditingDiseaseIndications] = useState('');
  const [editingDiseasePhotoUrls, setEditingDiseasePhotoUrls] = useState([]); // Array para URLs existentes
  const [editingDiseasePhotoFiles, setEditingDiseasePhotoFiles] = useState([]); // Array para nuevos archivos al editar
  const [editingDiseasePhotoPreviewUrls, setEditingDiseasePhotoPreviewUrls] = useState([]); // Array para previsualizaciones al editar

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

  // Función auxiliar para generar URLs de previsualización
  const generatePreviewUrls = (files) => {
    return Promise.all(
      Array.from(files).map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      })
    );
  };

  // Manejar el cambio de archivo para el nuevo formulario (múltiples archivos)
  const handleNewPhotoChange = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setNewDiseasePhotoFiles(Array.from(files));
      const urls = await generatePreviewUrls(files);
      setNewDiseasePhotoPreviewUrls(urls);
    } else {
      setNewDiseasePhotoFiles([]);
      setNewDiseasePhotoPreviewUrls([]);
    }
  };

  // Manejar el cambio de archivo para el formulario de edición (múltiples archivos)
  const handleEditPhotoChange = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setEditingDiseasePhotoFiles(Array.from(files));
      const urls = await generatePreviewUrls(files);
      setEditingDiseasePhotoPreviewUrls(urls);
    } else {
      setEditingDiseasePhotoFiles([]);
      setEditingDiseasePhotoPreviewUrls([]);
    }
  };

  // Función para subir un array de archivos a Firebase Storage
  const uploadFilesToStorage = async (files) => {
    const uploadedUrls = [];
    if (!files || files.length === 0) return uploadedUrls;

    const storage = getStorage(db.app); // Asegúrate de que getStorage está disponible
    
    for (const file of files) {
      const imageRef = ref(storage, `disease_images/${file.name}_${Date.now()}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      uploadedUrls.push(url);
    }
    return uploadedUrls;
  };

  const handleAddDisease = async (e) => {
    e.preventDefault();
    if (!newDiseaseName.trim()) {
      addNotification("El nombre de la enfermedad no puede estar vacío.", "warning");
      return;
    }

    let photoUrls = [];
    if (newDiseasePhotoFiles.length > 0) {
      addNotification("Subiendo imágenes...", "info", 0);
      try {
        photoUrls = await uploadFilesToStorage(newDiseasePhotoFiles);
        addNotification("Imágenes subidas exitosamente.", "success");
      } catch (uploadError) {
        console.error("Error al subir las imágenes:", uploadError);
        addNotification("Error al subir las imágenes. Intenta de nuevo.", "error");
        return; // No continuar si la subida falla
      }
    }

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/disease_catalog`), {
        name: newDiseaseName.trim(),
        symptoms: newDiseaseSymptoms.trim(),
        indications: newDiseaseIndications.trim(),
        photoUrls: photoUrls, // Guardar el array de URLs
        isActive: true,
        createdAt: new Date(),
        createdBy: userId
      });
      addNotification("Enfermedad añadida exitosamente.", "success");
      setNewDiseaseName('');
      setNewDiseaseSymptoms('');
      setNewDiseaseIndications('');
      setNewDiseasePhotoFiles([]);
      setNewDiseasePhotoPreviewUrls([]);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir enfermedad:", error);
      addNotification("Error al añadir enfermedad.", "error");
    }
  };

  const handleEditDisease = (disease) => {
    setEditingDiseaseId(disease.id);
    setEditingDiseaseName(disease.name);
    setEditingDiseaseSymptoms(disease.symptoms || '');
    setEditingDiseaseIndications(disease.indications || '');
    setEditingDiseasePhotoUrls(disease.photoUrls || []); // Carga el array de URLs existente
    setEditingDiseasePhotoFiles([]); // Resetear nuevos archivos
    setEditingDiseasePhotoPreviewUrls(disease.photoUrls || []); // Previsualización con las URLs existentes
  };

  const handleSaveDisease = async (diseaseId) => {
    if (!editingDiseaseName.trim()) {
      addNotification("El nombre de la enfermedad no puede estar vacío.", "warning");
      return;
    }

    let finalPhotoUrls = [...editingDiseasePhotoUrls]; // Empezar con las URLs que ya existen

    if (editingDiseasePhotoFiles.length > 0) {
      addNotification("Actualizando imágenes...", "info", 0);
      try {
        const newUploadedUrls = await uploadFilesToStorage(editingDiseasePhotoFiles);
        finalPhotoUrls = [...finalPhotoUrls, ...newUploadedUrls]; // Añadir las nuevas URLs a las existentes
        addNotification("Nuevas imágenes subidas exitosamente.", "success");
      } catch (uploadError) {
        console.error("Error al subir las nuevas imágenes:", uploadError);
        addNotification("Error al subir las nuevas imágenes. Intenta de nuevo.", "error");
        return;
      }
    }

    try {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const diseaseDocRef = doc(db, `artifacts/${appId}/public/data/disease_catalog`, diseaseId);
      await updateDoc(diseaseDocRef, {
        name: editingDiseaseName.trim(),
        symptoms: editingDiseaseSymptoms.trim(),
        indications: editingDiseaseIndications.trim(),
        photoUrls: finalPhotoUrls, // Actualizar con el array final de URLs
        updatedAt: new Date(),
        updatedBy: userId
      });
      addNotification("Enfermedad actualizada exitosamente.", "success");
      setEditingDiseaseId(null);
      setEditingDiseaseName('');
      setEditingDiseaseSymptoms('');
      setEditingDiseaseIndications('');
      setEditingDiseasePhotoUrls([]);
      setEditingDiseasePhotoFiles([]);
      setEditingDiseasePhotoPreviewUrls([]);
    } catch (error) {
      console.error("Error al actualizar enfermedad:", error);
      addNotification("Error al actualizar enfermedad.", "error");
    }
  };

  const handleRemoveEditingPhoto = (indexToRemove) => {
    setEditingDiseasePhotoUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setEditingDiseasePhotoPreviewUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
    addNotification("La foto será eliminada al guardar los cambios.", "info");
  };

  const handleCancelEdit = () => {
    setEditingDiseaseId(null);
    setEditingDiseaseName('');
    setEditingDiseaseSymptoms('');
    setEditingDiseaseIndications('');
    setEditingDiseasePhotoUrls([]);
    setEditingDiseasePhotoFiles([]);
    setEditingDiseasePhotoPreviewUrls([]);
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
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Catálogo de Enfermedades</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nueva Enfermedad
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddDisease} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Nueva Enfermedad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="newDiseaseName" className="block text-gray-200 text-sm font-bold mb-2">Nombre:</label>
              <input
                type="text"
                id="newDiseaseName"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                value={newDiseaseName}
                onChange={(e) => setNewDiseaseName(e.target.value)}
                required
              />
            </div>
            {/* Campo para subir múltiples fotos en el formulario de añadir */}
            <div>
              <label htmlFor="newDiseasePhoto" className="block text-gray-200 text-sm font-bold mb-2">Fotos (Opcional):</label>
              <input
                type="file"
                id="newDiseasePhoto"
                accept="image/*"
                multiple // Permitir seleccionar múltiples archivos
                onChange={handleNewPhotoChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 cursor-pointer"
              />
              {newDiseasePhotoPreviewUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {newDiseasePhotoPreviewUrls.map((url, index) => (
                    <img key={index} src={url} alt={`Previsualización ${index}`} className="w-24 h-24 object-cover rounded-md shadow-md border border-gray-600" />
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="newDiseaseSymptoms" className="block text-gray-200 text-sm font-bold mb-2">Síntomas:</label>
              <textarea
                id="newDiseaseSymptoms"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                value={newDiseaseSymptoms}
                onChange={(e) => setNewDiseaseSymptoms(e.target.value)}
                rows="3"
                placeholder="Ej: Hojas amarillas, manchas en el fruto, marchitez."
              ></textarea>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="newDiseaseIndications" className="block text-gray-200 text-sm font-bold mb-2">Indicaciones/Qué hacer:</label>
              <textarea
                id="newDiseaseIndications"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Enfermedad
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewDiseaseName('');
                setNewDiseaseSymptoms('');
                setNewDiseaseIndications('');
                setNewDiseasePhotoFiles([]);
                setNewDiseasePhotoPreviewUrls([]);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Enfermedades Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-700 border-b border-gray-600">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Síntomas</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Indicaciones</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Fotos</th> {/* Columna actualizada */}
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {diseases.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm text-gray-300 text-center">
                  No hay enfermedades registradas.
                </td>
              </tr>
            ) : (
              diseases.map((disease) => (
                <tr key={disease.id} className="hover:bg-gray-700">
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingDiseaseId === disease.id ? (
                      <input
                        type="text"
                        value={editingDiseaseName}
                        onChange={(e) => setEditingDiseaseName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                      />
                    ) : (
                      <p className="text-gray-100 whitespace-no-wrap">{disease.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingDiseaseId === disease.id ? (
                      <textarea
                        value={editingDiseaseSymptoms}
                        onChange={(e) => setEditingDiseaseSymptoms(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                        rows="2"
                      />
                    ) : (
                      <p className="text-gray-100 whitespace-no-wrap text-sm">{disease.symptoms || 'N/A'}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingDiseaseId === disease.id ? (
                      <textarea
                        value={editingDiseaseIndications}
                        onChange={(e) => setEditingDiseaseIndications(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                        rows="2"
                      />
                    ) : (
                      <p className="text-gray-100 whitespace-no-wrap text-sm">{disease.indications || 'N/A'}</p>
                    )}
                  </td>
                  {/* Columna para mostrar y editar fotos */}
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingDiseaseId === disease.id ? (
                      <div>
                        <label htmlFor={`editDiseasePhoto-${disease.id}`} className="block text-gray-200 text-sm font-bold mb-2">Añadir Más Fotos:</label>
                        <input
                          type="file"
                          id={`editDiseasePhoto-${disease.id}`}
                          accept="image/*"
                          multiple // Permitir seleccionar múltiples archivos
                          onChange={handleEditPhotoChange}
                          className="block w-full text-sm text-gray-300 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 cursor-pointer"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {editingDiseasePhotoPreviewUrls.length > 0 ? (
                            editingDiseasePhotoPreviewUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <img src={url} alt={`Previsualización ${index}`} className="w-24 h-24 object-cover rounded-md shadow-md border border-gray-600" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditingPhoto(index)}
                                  className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Eliminar foto"
                                >
                                  X
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-400 text-xs">Sin fotos seleccionadas.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      disease.photoUrls && disease.photoUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {disease.photoUrls.map((url, index) => (
                            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                              <img src={url} alt={`Enfermedad ${index}`} className="w-16 h-16 object-cover rounded-md" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400">N/A</p>
                      )
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingDiseaseId === disease.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveDisease(disease.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditDisease(disease)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveDisease(disease.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
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

// Componente Modal para seleccionar una enfermedad del catálogo
// Debe ir antes de ReportDiseaseForm porque ReportDiseaseForm lo utiliza.
const DiseaseSelectionModal = ({ diseases, onSelect, onClose }) => {
  const { addNotification } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDiseases, setFilteredDiseases] = useState(diseases);
  const [selectedDiseaseInModal, setSelectedDiseaseInModal] = useState(null); // Para mostrar detalles en el modal

  useEffect(() => {
    setFilteredDiseases(
      diseases.filter(disease =>
        disease.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (disease.symptoms && disease.symptoms.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );
  }, [searchTerm, diseases]);

  const handleSelectClick = (disease) => {
    onSelect(disease);
    addNotification(`Enfermedad "${disease.name}" seleccionada.`, "info");
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <h3 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Catálogo de Enfermedades</h3>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre o síntomas..."
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredDiseases.length === 0 ? (
          <p className="text-gray-300 text-center py-8">No se encontraron enfermedades que coincidan con la búsqueda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {filteredDiseases.map(disease => (
              <div
                key={disease.id}
                className="p-4 rounded-lg shadow-md bg-gray-700 border border-gray-600 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => setSelectedDiseaseInModal(disease)} // Muestra detalles al hacer clic
              >
                <h4 className="text-xl font-semibold text-emerald-300 mb-2">{disease.name}</h4>
                {disease.photoUrls && disease.photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {disease.photoUrls.slice(0, 2).map((url, index) => ( // Muestra un par de fotos en la tarjeta
                      <img key={index} src={url} alt={disease.name} className="w-20 h-20 object-cover rounded-md" />
                    ))}
                    {disease.photoUrls.length > 2 && <span className="text-gray-400 self-end ml-1">+{disease.photoUrls.length - 2}</span>}
                  </div>
                )}
                <p className="text-sm text-gray-300 line-clamp-3">
                  <span className="font-medium text-gray-100">Síntomas:</span> {disease.symptoms || 'N/A'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelectClick(disease); }} // Detener propagación
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-full text-sm transition duration-300 w-full"
                >
                  Seleccionar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Cerrar Catálogo
          </button>
        </div>

        {/* Modal de detalles de una enfermedad dentro del catálogo */}
        {selectedDiseaseInModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-85 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-700 rounded-lg shadow-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto relative border border-gray-600">
              <button
                onClick={() => setSelectedDiseaseInModal(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-100 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <h4 className="text-2xl font-bold text-emerald-300 mb-4 border-b border-gray-600 pb-2">{selectedDiseaseInModal.name}</h4>
              
              {selectedDiseaseInModal.photoUrls && selectedDiseaseInModal.photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4 justify-center">
                  {selectedDiseaseInModal.photoUrls.map((url, index) => (
                    <img key={index} src={url} alt={selectedDiseaseInModal.name} className="w-32 h-32 object-cover rounded-md shadow-md border border-gray-500" />
                  ))}
                </div>
              )}

              <p className="text-gray-200 mb-3">
                <span className="font-semibold text-gray-100">Síntomas:</span> {selectedDiseaseInModal.symptoms || 'N/A'}
              </p>
              <p className="text-gray-200 mb-4">
                <span className="font-semibold text-gray-100">Indicaciones:</span> {selectedDiseaseInModal.indications || 'N/A'}
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => handleSelectClick(selectedDiseaseInModal)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Seleccionar esta
                </button>
                <button
                  onClick={() => setSelectedDiseaseInModal(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Volver al Catálogo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// Componente para reportar una Enfermedad
const ReportDiseaseForm = () => {
  const { db, userId, isAuthReady, addNotification } = useContext(AppContext);
  const locations = useLocations(); // Asumo que useLocations está definido antes o es accesible
  const [diseases, setDiseases] = useState([]); // Catálogo completo de enfermedades
  const [showDiseaseSelectionModal, setShowDiseaseSelectionModal] = useState(false); // Nuevo: para controlar el modal
  const [selectedDiseaseDetails, setSelectedDiseaseDetails] = useState(null); // Nuevo: detalles de la enfermedad seleccionada

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    diseaseId: '', // Ahora se actualizará desde selectedDiseaseDetails
    severity: 'Baja',
    comments: '',
    photoFile: null,
    photoPreviewUrl: ''
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoPreviewUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({ ...prev, photoFile: null, photoPreviewUrl: '' }));
    }
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

  // Función para manejar la selección de una enfermedad desde el modal
  const handleDiseaseSelect = (disease) => {
    setSelectedDiseaseDetails(disease);
    setFormData(prev => ({ ...prev, diseaseId: disease.id }));
    setShowDiseaseSelectionModal(false); // Cerrar el modal
  };

  const handleSuggestDiagnosis = async () => {
    if (!formData.comments.trim()) {
      addNotification("Por favor, introduce comentarios sobre los síntomas para la sugerencia de diagnóstico.", "warning");
      return;
    }
    if (!selectedDiseaseDetails) {
        addNotification("Por favor, selecciona una enfermedad para obtener un diagnóstico más preciso.", "warning");
        return;
    }

    setAiLoading(true);
    setAiDiagnosis('');
    addNotification("Generando sugerencia de diagnóstico IA...", "info", 0);

    try {
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      // Usar selectedDiseaseDetails para el nombre de la enfermedad
      const diseaseNameForPrompt = selectedDiseaseDetails ? selectedDiseaseDetails.name : 'no especificada';

      const prompt = `Soy un agricultor de fresas hidropónicas. Mis plantas en ${selectedLocation ? selectedLocation.name : 'una ubicación no especificada'} están mostrando los siguientes síntomas: "${formData.comments}". La severidad reportada es "${formData.severity}". Si ya he identificado la enfermedad como "${diseaseNameForPrompt}".
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
    // Validar que se haya seleccionado una enfermedad y todos los campos obligatorios
    if (!formData.date || !formData.locationId || !selectedDiseaseDetails || !formData.severity) {
      addNotification("Por favor, rellena los campos obligatorios: Fecha, Ubicación, Enfermedad y Severidad.", "warning");
      return;
    }

    let imageUrl = '';
    // Lógica REAL para subir a Firebase Storage (necesita getStorage, ref, uploadBytes, getDownloadURL)
    // Asegúrate de que estas funciones estén disponibles en el scope global de App.js
    if (formData.photoFile) {
      addNotification("Subiendo imagen...", "info", 0);
      try {
        const storage = getStorage(db.app); // Asumo que db.app te da la instancia de Firebase App
        const imageRef = ref(storage, `disease_reports_images/${formData.photoFile.name}_${Date.now()}`);
        await uploadBytes(imageRef, formData.photoFile);
        imageUrl = await getDownloadURL(imageRef);
        addNotification("Imagen de reporte subida exitosamente.", "success");
      } catch (uploadError) {
        console.error("Error al subir la imagen del reporte:", uploadError);
        addNotification("Error al subir la imagen del reporte. Intenta de nuevo.", "error");
        return; // No continuar si la subida falla
      }
    }

    try {
      const selectedLocation = locations.find(loc => loc.id === formData.locationId);
      if (!selectedLocation) {
        addNotification("Ubicación seleccionada no válida.", "error");
        return;
      }

      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/disease_reports`), {
        date: new Date(formData.date),
        locationId: formData.locationId,
        locationName: selectedLocation.name,
        diseaseId: selectedDiseaseDetails.id, // Usar el ID de la enfermedad seleccionada
        diseaseName: selectedDiseaseDetails.name, // Usar el nombre de la enfermedad seleccionada
        severity: formData.severity,
        comments: formData.comments,
        photoUrl: imageUrl,
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
        photoFile: null,
        photoPreviewUrl: ''
      });
      setSelectedDiseaseDetails(null); // Limpiar la enfermedad seleccionada
      setAiDiagnosis('');
    } catch (error) {
      console.error("Error al registrar reporte de enfermedad:", error);
      addNotification("Error al registrar reporte de enfermedad.", "error");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Reportar Enfermedad</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="diseaseDate" className="block text-gray-200 text-sm font-bold mb-2">Fecha:</label>
          <input
            type="date"
            id="diseaseDate"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            required
          />
        </div>
        <div>
          <label htmlFor="locationId" className="block text-gray-200 text-sm font-bold mb-2">Ubicación:</label>
          <select
            id="locationId"
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
            required
          >
            <option value="">Selecciona una ubicación</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="selectedDiseaseName" className="block text-gray-200 text-sm font-bold mb-2">Enfermedad Seleccionada:</label>
          <div className="flex gap-2">
            <input
              type="text"
              id="selectedDiseaseName"
              value={selectedDiseaseDetails ? selectedDiseaseDetails.name : ''}
              readOnly // El usuario no puede escribir directamente aquí
              placeholder="Haz clic en 'Buscar Enfermedad' para seleccionar"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white cursor-pointer"
              onClick={() => setShowDiseaseSelectionModal(true)} // Abre el modal al hacer clic en el input
              required // Ahora es requerido que haya una enfermedad seleccionada
            />
            <button
              type="button"
              onClick={() => setShowDiseaseSelectionModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
            >
              Buscar Enfermedad
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="severity" className="block text-gray-200 text-sm font-bold mb-2">Severidad:</label>
          <select
            id="severity"
            name="severity"
            value={formData.severity}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            required
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <div>
          <label htmlFor="photoUpload" className="block text-gray-200 text-sm font-bold mb-2">Subir Foto (opcional):</label>
          <input
            type="file"
            id="photoUpload"
            name="photoUpload"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 cursor-pointer"
          />
          {formData.photoPreviewUrl && (
            <div className="mt-2">
              <img src={formData.photoPreviewUrl} alt="Previsualización" className="max-w-xs h-auto rounded-lg shadow-md border border-gray-600" />
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="comments" className="block text-gray-200 text-sm font-bold mb-2">Comentarios:</label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            rows="4"
            placeholder="Observaciones adicionales sobre la enfermedad detectada..."
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
          ></textarea>
          <button
            type="button"
            onClick={handleSuggestDiagnosis}
            disabled={aiLoading}
            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading ? 'Generando...' : 'Sugerir Diagnóstico IA ✨'}
          </button>
        </div>

        {aiDiagnosis && (
          <div className="md:col-span-2 mt-4 p-4 bg-purple-900 rounded-lg border border-purple-700">
            <h3 className="text-lg font-semibold text-purple-300 mb-2">Sugerencia de Diagnóstico IA:</h3>
            <p className="text-gray-100 whitespace-pre-wrap">{aiDiagnosis}</p>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Registrar Reporte
          </button>
        </div>
      </form>

      {/* Modal para seleccionar enfermedades */}
      {showDiseaseSelectionModal && (
        <DiseaseSelectionModal
          diseases={diseases}
          onSelect={handleDiseaseSelect}
          onClose={() => setShowDiseaseSelectionModal(false)}
        />
      )}
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
      const updatedNutrients = [...newRecipeNutrients].filter((_, i) => i !== index);
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
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Recetas de Nutrientes</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nueva Receta
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddRecipe} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Nueva Receta</h3>
          <div className="mb-4">
            <label htmlFor="newRecipeName" className="block text-gray-200 text-sm font-bold mb-2">Nombre de la Receta:</label>
            <input
              type="text"
              id="newRecipeName"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
              required
            />
          </div>
          <h4 className="text-xl font-semibold text-emerald-300 mb-3">Nutrientes y Proporciones</h4>
          {newRecipeNutrients.map((nutrient, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-3 border border-gray-600 rounded-md bg-gray-800">
              <div>
                <label htmlFor={`newNutrientName-${index}`} className="block text-gray-200 text-xs font-bold mb-1">Nombre Nutriente:</label>
                <input
                  type="text"
                  id={`newNutrientName-${index}`}
                  name="name"
                  value={nutrient.name}
                  onChange={(e) => handleNewNutrientChange(index, e)}
                  className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                  placeholder="Ej: Nitrato de Calcio"
                  required
                />
              </div>
              <div>
                <label htmlFor={`newNutrientProportion-${index}`} className="block text-gray-200 text-xs font-bold mb-1">Proporción (g/L):</label>
                <input
                  type="number"
                  step="0.01"
                  id={`newNutrientProportion-${index}`}
                  name="proportion"
                  value={nutrient.proportion}
                  onChange={(e) => handleNewNutrientChange(index, e)}
                  className="shadow appearance-none border rounded-md w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                  required
                />
              </div>
              <div className="flex items-center pt-2">
                {newRecipeNutrients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNutrientRow(index)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs"
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
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-sm mt-2"
          >
            Añadir Otro Nutriente
          </button>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Guardar Receta
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Recetas Existentes</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-700 border-b border-gray-600">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre de Receta</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nutrientes (Proporción g/L)</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recipes.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm text-gray-300 text-center">
                  No hay recetas de nutrientes registradas.
                </td>
              </tr>
            ) : (
              recipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-gray-700">
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingRecipeId === recipe.id ? (
                      <input
                        type="text"
                        value={editingRecipeName}
                        onChange={(e) => setEditingRecipeName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                      />
                    ) : (
                      <p className="text-gray-100 whitespace-no-wrap">{recipe.name}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingRecipeId === recipe.id ? (
                      <div>
                        {editingRecipeNutrients.map((nutrient, index) => (
                          <div key={index} className="flex gap-2 items-center mb-1">
                            <input
                              type="text"
                              name="name"
                              value={nutrient.name}
                              onChange={(e) => handleEditingNutrientChange(index, e)}
                              className="shadow appearance-none border rounded py-1 px-2 text-gray-800 text-xs w-2/5 bg-gray-700 text-white"
                            />
                            <input
                              type="number"
                              step="0.01"
                              name="proportion"
                              value={nutrient.proportion}
                              onChange={(e) => handleEditingNutrientChange(index, e)}
                              className="shadow appearance-none border rounded py-1 px-2 text-gray-800 text-xs w-1/4 bg-gray-700 text-white"
                            />
                            <span className="text-xs text-gray-300">g/L</span>
                            {editingRecipeNutrients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNutrientRow(index, true)}
                                className="bg-red-500 hover:bg-red-600 text-white py-0.5 px-1 rounded-full text-xs"
                              >
                                X
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddNutrientRow(true)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded-full text-xs mt-2"
                        >
                          + Nutriente
                        </button>
                      </div>
                    ) : (
                      <ul className="list-disc list-inside text-gray-100 whitespace-no-wrap">
                        {recipe.nutrients.map((nutrient, index) => (
                          <li key={index}>{nutrient.name}: {nutrient.proportion} g/L</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingRecipeId === recipe.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveRecipe(recipe.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditRecipe(recipe.id, recipe.name, recipe.nutrients)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveRecipe(recipe.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
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

  const handleSubmit = (e) => {
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
    <div className="container mx-auto p-4 max-w-2xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Calculadora de Mezcla de Nutrientes</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="recipeSelect" className="block text-gray-200 text-sm font-bold mb-2">Selecciona una Receta:</label>
          <select
            id="recipeSelect"
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            required
          >
            <option value="">-- Selecciona una receta --</option>
            {recipes.map(recipe => (
              <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mixLiters" className="block text-gray-200 text-sm font-bold mb-2">Cantidad de Litros a Preparar:</label>
          <input
            type="number"
            step="0.01"
            id="mixLiters"
            value={mixLiters}
            onChange={(e) => setMixLiters(e.target.value)}
            placeholder="Ej: 200"
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            required
          />
        </div>
        <div className="flex justify-end gap-4 mt-4">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Calcular
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Limpiar
          </button>
        </div>
      </form>

      {calculatedNutrients.length > 0 && (
        <div className="mt-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Cantidades Calculadas:</h3>
          <ul className="list-disc list-inside text-gray-100 text-lg">
            {calculatedNutrients.map((nutrient, index) => (
              <li key={index}>{nutrient.name}: {nutrient.grams} gramos</li>
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
  const [operators, setOperators] = useState([]); // Estado para almacenar los operarios
  const [inputsCatalog, setInputsCatalog] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    laborTypeId: '',
    assignedToUserId: '', // ¡Este es el campo añadido!
    plannedInputs: [{ inputId: '', quantity: '', unit: '' }],
  });
  const [showPlannedInputs, setShowPlannedInputs] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

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

      // Obtener usuarios con rol 'basic' para la asignación
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
        assignedToUserName: assignedOperator.email || assignedOperator.id, // Guardar el email o ID del operario
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
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Planificación de Labores (Asignar Tareas)</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="taskName" className="block text-gray-200 text-sm font-bold mb-2">Nombre de la Tarea:</label>
            <input
              type="text"
              id="taskName"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="taskDate" className="block text-gray-200 text-sm font-bold mb-2">Fecha Límite:</label>
            <input
              type="date"
              id="taskDate"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="locationId" className="block text-gray-200 text-sm font-bold mb-2">Ubicación:</label>
            <select
              id="locationId"
              name="locationId"
              value={formData.locationId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
              required
            >
              <option value="">Selecciona una ubicación</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="laborTypeId" className="block text-gray-200 text-sm font-bold mb-2">Tipo de Labor:</label>
            <select
              id="laborTypeId"
              name="laborTypeId"
              value={formData.laborTypeId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
              required
            >
              <option value="">Selecciona un tipo de labor</option>
              {laborTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          {/* Campo añadido para asignar a un operario */}
          <div>
            <label htmlFor="assignedToUserId" className="block text-gray-200 text-sm font-bold mb-2">Asignar a:</label>
            <select
              id="assignedToUserId"
              name="assignedToUserId"
              value={formData.assignedToUserId}
              onChange={handleChange}
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
              required
            >
              <option value="">Selecciona un operario</option>
              {operators.map(operator => (
                <option key={operator.id} value={operator.id}>{operator.email || operator.id}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2"> {/* Asegúrate de que este div abarque correctamente el espacio restante si el grid tiene 2 columnas */}
            <label htmlFor="description" className="block text-gray-200 text-sm font-bold mb-2">Descripción / Observaciones:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Detalles adicionales sobre la tarea a realizar."
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            ></textarea>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={aiLoading}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? 'Generando...' : 'Generar Descripción IA ✨'}
            </button>
          </div>
        </div>

        {showPlannedInputs && (
          <div className="mb-6 p-6 bg-gray-700 rounded-lg shadow-inner">
            <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Insumos Planificados (Opcional)</h3>
            {formData.plannedInputs.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-600 rounded-md bg-gray-800">
                <div>
                  <label htmlFor={`plannedInputId-${index}`} className="block text-gray-200 text-sm font-bold mb-2">Insumo:</label>
                  <select
                    id={`plannedInputId-${index}`}
                    name="inputId"
                    value={item.inputId}
                    onChange={(e) => handlePlannedInputChange(index, e)}
                    className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                    required
                  >
                    <option value="">Selecciona insumo</option>
                    {inputsCatalog.map(input => (
                      <option key={input.id} value={input.id}>{input.name} ({input.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`plannedQuantity-${index}`} className="block text-gray-200 text-sm font-bold mb-2">Cantidad:</label>
                  <input
                    type="number"
                    step="0.01"
                    id={`plannedQuantity-${index}`}
                    name="quantity"
                    value={item.quantity}
                    onChange={(e) => handlePlannedInputChange(index, e)}
                    className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                    required
                  />
                </div>
                <div className="flex items-center pt-2">
                  <span className="text-gray-200 text-sm font-bold block mb-2">Unidad:</span>
                  <p className="ml-2 text-gray-100">{item.unit || '-'}</p>
                </div>
                <div className="flex items-center pt-2">
                  {formData.plannedInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlannedInputRow(index)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs"
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
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105 mt-2"
            >
              Añadir Otro Insumo Planificado
            </button>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Asignar Tarea
          </button>
        </div>
      </form>
    </div>
  );
};

// Nuevo componente Modal para ver los detalles de la tarea
const TaskDetailModal = ({ task, onClose }) => {
  if (!task) return null; // No renderizar si no hay tarea

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <h3 className="text-3xl font-bold text-emerald-400 mb-4 border-b-2 border-gray-700 pb-2">{task.name}</h3>

        <div className="space-y-4 text-gray-200">
          <p>
            <span className="font-semibold text-gray-100">Tipo de Labor:</span> {task.laborTypeName}
          </p>
          <p>
            <span className="font-semibold text-gray-100">Ubicación:</span> {task.locationName}
          </p>
          <p>
            <span className="font-semibold text-gray-100">Fecha Límite:</span> {task.date.toDate().toLocaleDateString()}
          </p>
          <p>
            <span className="font-semibold text-gray-100">Estado:</span>{' '}
            <span className={`font-semibold ${task.status === 'completed' ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {task.status === 'pending' ? 'Pendiente' : 'Completada'}
            </span>
          </p>
          {task.completedAt && (
            <p>
              <span className="font-semibold text-gray-100">Completada el:</span> {task.completedAt.toDate().toLocaleDateString()}
            </p>
          )}
          {task.assignedToUserName && (
            <p>
              <span className="font-semibold text-gray-100">Asignada a:</span> {task.assignedToUserName}
            </p>
          )}

          {task.description && (
            <div>
              <p className="font-semibold text-gray-100">Descripción / Observaciones:</p>
              <p className="whitespace-pre-wrap leading-relaxed">{task.description}</p> {/* Usa whitespace-pre-wrap para conservar saltos de línea */}
            </div>
          )}

          {task.plannedInputs && task.plannedInputs.length > 0 && (
            <div>
              <p className="font-semibold text-gray-100">Insumos Planificados:</p>
              <ul className="list-disc list-inside ml-4 text-sm">
                {task.plannedInputs.map((input, idx) => (
                  <li key={idx}>
                    {input.inputName}: {input.quantity} {input.unit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};


// Componente para ver las actividades asignadas a un operario
const MyActivities = () => {
  const { db, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null); // Nuevo estado para la tarea seleccionada del modal

  useEffect(() => {
    if (db && isAuthReady && userId) {
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const tasksColRef = collection(db, `artifacts/${appId}/public/data/tasks`);
      const q = query(tasksColRef, where('assignedToUserId', '==', userId));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        tasksData.sort((a, b) => {
          // Primero las pendientes, luego por fecha límite
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          
          // Asegúrate de que 'date' sea un objeto Date para comparar
          const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
          const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
          return dateA.getTime() - dateB.getTime();
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
      // Si el modal está abierto, ciérralo al completar la tarea
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error("Error al marcar tarea como completada:", error);
      addNotification("Error al marcar tarea como completada.", "error");
    }
  };

  // Función para abrir el modal de detalles
  const handleViewDetails = (task) => {
    setSelectedTask(task);
  };

  // Función para cerrar el modal de detalles
  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  if (userRole !== 'basic') {
    return (
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Mis Actividades Asignadas</h2>
      {assignedTasks.length === 0 ? (
        <p className="text-gray-300 text-center py-8">No tienes actividades asignadas actualmente.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedTasks.map(task => (
            <div
              key={task.id}
              className={`p-6 rounded-lg shadow-md ${task.status === 'completed' ? 'bg-emerald-900 border-emerald-700' : 'bg-gray-700 border-gray-600'}
                cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-200 ease-in-out
              `}
              onClick={() => handleViewDetails(task)} // Abre el modal al hacer clic en la tarjeta
            >
              <h3 className="text-xl font-semibold text-emerald-300 mb-2">{task.name}</h3>
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-medium text-gray-100">Tipo:</span> {task.laborTypeName}
              </p>
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-medium text-gray-100">Ubicación:</span> {task.locationName}
              </p>
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-medium text-gray-100">Fecha Límite:</span> {task.date.toDate().toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-300 mb-3">
                <span className="font-medium text-gray-100">Estado:</span>{" "}
                <span className={`font-semibold ${task.status === 'completed' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {task.status === 'pending' ? 'Pendiente' : 'Completada'}
                </span>
              </p>
              {task.description && (
                <p className="text-sm text-gray-300 mb-3 line-clamp-3"> {/* Limita la descripción a 3 líneas */}
                  <span className="font-medium text-gray-100">Observaciones:</span> {task.description}
                </p>
              )}
              {task.plannedInputs && task.plannedInputs.length > 0 && (
                <div className="mt-2 text-sm text-gray-300">
                  <p className="font-medium text-gray-100">Insumos Planificados:</p>
                  <ul className="list-disc list-inside ml-4 line-clamp-2"> {/* Limita los insumos a 2 líneas */}
                    {task.plannedInputs.map((input, idx) => (
                      <li key={idx}>{input.inputName}: {input.quantity} {input.unit}</li>
                    ))}
                  </ul>
                </div>
              )}
              {task.status === 'completed' && task.completedAt && (
                <p className="text-xs text-gray-400 mt-2">
                  Completada el: {task.completedAt.toDate().toLocaleDateString()}
                </p>
              )}
              {task.status === 'pending' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMarkAsCompleted(task.id); }} // Detener la propagación para no abrir el modal
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105 w-full"
                >
                  Marcar como Completada
                </button>
              )}
              {/* Botón para ver detalles si la tarjeta no es clickeable completamente o como alternativa */}
              <button
                onClick={(e) => { e.stopPropagation(); handleViewDetails(task); }}
                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm transition duration-300 w-full"
              >
                Ver Detalles
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Renderiza el modal si hay una tarea seleccionada */}
      <TaskDetailModal task={selectedTask} onClose={handleCloseModal} />
    </div>
  );
};
// Componente para la Gestión de Usuarios
const UserManagement = () => {
  const { db, auth, userId, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('basic');
  const [newUserPassword, setNewUserPassword] = useState(''); // Nuevo: para la clave del nuevo usuario
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
        // Filtramos al usuario actual para que no se pueda editar a sí mismo aquí fácilmente
        setUsers(usersData.filter(user => user.id !== userId));
      }, (error) => {
        console.error("Error al obtener la lista de usuarios:", error);
        addNotification("Error al cargar usuarios.", "error");
      });
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady, userRole, addNotification]);

  // Función para generar una clave aleatoria simple
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) { // Longitud de la clave
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      addNotification("El email y la contraseña del usuario no pueden estar vacíos.", "warning");
      return;
    }

    try {
      // 1. Crear el usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail.trim(), newUserPassword.trim());
      const newUid = userCredential.user.uid;

      // 2. Guardar la información del usuario en Firestore (utilizando el UID de Auth)
      const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, newUid);
      await setDoc(userDocRef, {
        email: newUserEmail.trim(),
        role: newUserRole,
        isActive: true,
        createdAt: new Date(),
        createdBy: userId,
        // No guardamos la contraseña en Firestore por seguridad
      });

      addNotification(`Usuario ${newUserEmail.trim()} añadido exitosamente con ID: ${newUid}. Clave asignada: ${newUserPassword.trim()}.`, "success", 10000); // Muestra la clave temporalmente
      setNewUserEmail('');
      setNewUserRole('basic');
      setNewUserPassword('');
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al añadir usuario:", error);
      let errorMessage = "Error al añadir usuario.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "El email proporcionado ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
      addNotification(errorMessage, "error");
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

  // Nueva función para enviar restablecimiento de contraseña
  const handleSendPasswordReset = async (userEmail) => {
    if (!userEmail || userEmail === 'N/A') {
      addNotification("No se puede restablecer la contraseña para un usuario sin email.", "warning");
      return;
    }
    if (!window.confirm(`¿Estás seguro de que quieres enviar un correo de restablecimiento de contraseña a ${userEmail}?`)) {
      return;
    }
    try {
      await sendPasswordResetEmail(auth, userEmail);
      addNotification(`Correo de restablecimiento enviado a ${userEmail}.`, "info");
    } catch (error) {
      console.error("Error al enviar correo de restablecimiento:", error);
      let errorMessage = "Error al enviar correo de restablecimiento.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No se encontró un usuario con ese email.";
      }
      addNotification(errorMessage, "error");
    }
  };


  if (userRole !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Gestión de Usuarios</h2>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 mb-6"
        >
          Añadir Nuevo Usuario
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddUser} className="mb-8 p-6 bg-gray-700 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Nuevo Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="newUserEmail" className="block text-gray-200 text-sm font-bold mb-2">Email:</label>
              <input
                type="email"
                id="newUserEmail"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="ej: usuario@ejemplo.com"
                required // Email ahora es obligatorio para crear cuentas con contraseña
              />
            </div>
            <div>
              <label htmlFor="newUserRole" className="block text-gray-200 text-sm font-bold mb-2">Rol:</label>
              <select
                id="newUserRole"
                className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                required
              >
                <option value="basic">Operario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="newUserPassword" className="block text-gray-200 text-sm font-bold mb-2">Contraseña Inicial:</label>
              <div className="flex gap-2">
                <input
                  type="text" // Cambiado a text para poder ver la clave generada
                  id="newUserPassword"
                  className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Se recomienda generar una clave"
                  required
                />
                <button
                  type="button"
                  onClick={() => setNewUserPassword(generateRandomPassword())}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Generar
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                La contraseña debe tener al menos 6 caracteres. Considera notificar la clave al usuario de forma segura.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Crear Usuario
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewUserEmail('');
                setNewUserRole('basic');
                setNewUserPassword('');
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="text-2xl font-semibold text-emerald-300 mb-4">Usuarios Registrados</h3>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-700 border-b border-gray-600">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">ID de Usuario</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Rol</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm text-gray-300 text-center">
                  No hay usuarios registrados (excepto el actual administrador).
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700">
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    <p className="text-gray-100 whitespace-no-wrap">{user.id}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    <p className="text-gray-100 whitespace-no-wrap">{user.email || 'N/A'}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingUserId === user.id ? (
                      <select
                        value={editingUserRole}
                        onChange={(e) => setEditingUserRole(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
                      >
                        <option value="basic">Operario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : (
                      <p className="text-gray-100 whitespace-no-wrap capitalize">{user.role}</p>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingUserId === user.id ? (
                      <select
                        value={editingUserActiveStatus}
                        onChange={(e) => setEditingUserActiveStatus(e.target.value === 'true')}
                        className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-800 text-xs bg-gray-700 text-white"
                      >
                        <option value={true}>Activo</option>
                        <option value={false}>Archivado</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {user.isActive ? 'Activo' : 'Archivado'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
                    {editingUserId === user.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveUser(user.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap"> {/* Flex-wrap para botones adicionales */}
                        <button
                          onClick={() => handleEditUser(user)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleArchiveUser(user.id, user.isActive)}
                          className={`font-bold py-1 px-3 rounded-full text-xs transition duration-300 ${user.isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                        >
                          {user.isActive ? 'Archivar' : 'Activar'}
                        </button>
                        {user.email && ( // Solo muestra el botón si el usuario tiene un email asociado
                            <button
                                onClick={() => handleSendPasswordReset(user.email)}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-full text-xs transition duration-300 mt-1 md:mt-0"
                            >
                                Restablecer Clave
                            </button>
                        )}
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
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 text-center bg-gray-800 text-gray-100 shadow-xl rounded-lg mt-10 border border-gray-700">
      <h2 className="text-4xl font-extrabold text-emerald-400 mb-6">¡Bienvenido, Operario!</h2>
      <p className="text-xl text-gray-300 mb-8">
        Tu ID de usuario es: <span className="font-mono bg-gray-700 px-3 py-1 rounded-md text-gray-100">{userId}</span>
      </p>
      <p className="text-lg text-gray-400 mb-10">
        Aquí podrás ver un resumen. Dirígete a "Mis Actividades" para ver tus tareas asignadas.
      </p>
      <button
        onClick={handleSignOut}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
      >
        Cerrar Sesión
      </button>
    </div>
  );
};

// New LoginForm Component
const LoginForm = () => {
  const { auth, addNotification } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      addNotification('Inicio de sesión exitoso.', 'success');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      addNotification(`Error al iniciar sesión: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold text-emerald-400 mb-6 text-center">Iniciar Sesión</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-200 text-sm font-bold mb-2">Correo Electrónico:</label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-200 text-sm font-bold mb-2">Contraseña:</label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-center">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// Componente para el Dashboard de Reportes
const ReportsDashboard = () => {
  const { db, isAuthReady, userRole, addNotification } = useContext(AppContext);
  const locations = useLocations(); // Obtiene las ubicaciones disponibles del hook useLocations
  const [reportType, setReportType] = useState('production_records');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationFilter, setLocationFilter] = useState(''); // Ahora contendrá el ID de la ubicación seleccionada
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
      // Modificación clave: Si se selecciona una ubicación, filtra por su 'name'
      if (locationFilter) {
        const selectedLocation = locations.find(loc => loc.id === locationFilter);
        if (selectedLocation) {
          qFilters.push(where('locationName', '==', selectedLocation.name));
        } else {
          addNotification("Ubicación seleccionada no válida. No se aplicará el filtro de ubicación.", "warning");
        }
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
      <div className="p-6 text-center text-red-500 bg-gray-900 text-white rounded-lg">
        No tienes permisos para acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Panel de Reportes</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-700 rounded-lg shadow-inner">
        <div>
          <label htmlFor="reportType" className="block text-gray-200 text-sm font-bold mb-2">Tipo de Reporte:</label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
          >
            {Object.entries(reportCollections).map(([key, value]) => (
              <option key={key} value={key}>{value.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="startDate" className="block text-gray-200 text-sm font-bold mb-2">Fecha Inicio:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-gray-200 text-sm font-bold mb-2">Fecha Fin:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
          />
        </div>
        <div>
          <label htmlFor="locationFilter" className="block text-gray-200 text-sm font-bold mb-2">Ubicación:</label>
          <select // Este es el cambio: de input a select
            id="locationFilter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-600 text-white"
          >
            <option value="">Todas las ubicaciones</option> {/* Opción para no filtrar por ubicación */}
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4 flex justify-end items-end">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="overflow-x-auto rounded-lg shadow-md mt-8">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-700 border-b border-gray-600">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {reportCollections[reportType].headers[0]}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {reportCollections[reportType].headers[1]}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {reportCollections[reportType].headers[2]}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {reportCollections[reportType].headers[3]}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {reportCollections[reportType].headers[4]}
                </th>
                {reportCollections[reportType].headers.slice(5).map((header, index) => (
                  <th key={index} className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, rowIndex) => (
                <tr key={row.id} className="hover:bg-gray-700">
                  {reportCollections[reportType].fields.map((field, colIndex) => (
                    <td key={`${row.id}-${field}`} className="px-5 py-5 border-b border-gray-600 bg-gray-800 text-sm">
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
                        row[field] ? <a href={row[field]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline"><img src={row[field]} alt="Foto Reporte" className="w-16 h-16 object-cover rounded-md"/></a> : 'N/A'
                      ) : field === 'totalCost' || field === 'amount' ? (
                        <p className="text-gray-100 whitespace-no-wrap">${parseFloat(row[field]).toFixed(2)}</p>
                      ) : (
                        <p className="text-gray-100 whitespace-no-wrap">{row[field]}</p>
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
        <p className="text-center text-gray-300 py-8">Utiliza los filtros para generar un reporte.</p>
      )}
    </div>
  );
};

// Componente para el registro de Labores
const LaborForm = () => {
  const { db, userId, isAuthReady, addNotification } = useContext(AppContext);
  const locations = useLocations(); // Asumo que useLocations está definido antes o es accesible
  const [laborTypes, setLaborTypes] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationId: '',
    laborTypeId: '',
    observations: ''
  });

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
    <div className="container mx-auto p-4 max-w-2xl bg-gray-800 text-gray-100 rounded-lg shadow-xl my-8 border border-gray-700">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">Registrar Labor</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="laborDate" className="block text-gray-200 text-sm font-bold mb-2">Fecha:</label>
          <input
            type="date"
            id="laborDate"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            required
          />
        </div>
        <div>
          <label htmlFor="locationId" className="block text-gray-200 text-sm font-bold mb-2">Ubicación:</label>
          <select
            id="locationId"
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
            required
          >
            <option value="">Selecciona una ubicación</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="laborTypeId" className="block text-gray-200 text-sm font-bold mb-2">Tipo de Labor:</label>
          <select
            id="laborTypeId"
            name="laborTypeId"
            value={formData.laborTypeId}
            onChange={handleChange}
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-gray-700 text-white"
            required
          >
            <option value="">Selecciona un tipo de labor</option>
            {laborTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="observations" className="block text-gray-200 text-sm font-bold mb-2">Observaciones:</label>
          <textarea
            id="observations"
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            rows="4"
            placeholder="Detalles sobre la labor realizada..."
            className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-700 text-white"
            required
          ></textarea>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Registrar Labor
          </button>
        </div>
      </form>
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado para el menú móvil

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
            // If user exists in Firebase Auth but not in Firestore 'users' collection
            // This case might happen if a user signs up via email/password
            // and their user data is not yet synced to Firestore.
            // For simplicity, we'll assign a basic role and create the document.
            setUserRole('basic');
            await setDoc(userDocRef, {
              email: user.email || `user_${user.uid.substring(0, 8)}@example.com`,
              role: 'basic',
              createdAt: new Date(),
              isActive: true,
              lastLoginAt: new Date(),
            }, { merge: true }); // Use merge: true to avoid overwriting if doc is partially there
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

    // Removed initial anonymous/custom token auth as requested,
    // to allow only email/password login.
    // If you need initial auth, you can put it back.
    // const handleInitialAuth = async () => {
    //   if (firebaseAuth && !firebaseAuth.currentUser) {
    //     const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN;
    //     try {
    //       if (initialAuthToken) {
    //         await signInWithCustomToken(firebaseAuth, initialAuthToken);
    //         addNotification("Sesión iniciada con token personalizado.", "info");
    //       } else {
    //         await signInAnonymously(firebaseAuth);
    //         addNotification("Sesión iniciada anónimamente.", "info");
    //       }
    //     } catch (error) {
    //       console.error("Error de autenticación inicial:", error);
    //       addNotification("Error de autenticación. Inténtalo de nuevo.", "error");
    //     }
    //   }
    // };
    // handleInitialAuth();


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

  // Función para manejar el clic en los elementos del menú
  const handleMenuItemClick = (page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false); // Cierra el menú móvil al hacer clic en un elemento
  };

  const renderNavLinks = (isMobile = false) => (
    <>
      <button
        onClick={() => handleMenuItemClick('dashboard')}
        className={`px-4 py-2 rounded-full transition duration-300 w-full text-left
          ${currentPage === 'dashboard' ? 'bg-emerald-700 text-white font-semibold shadow-md' : 'text-gray-300 hover:bg-gray-700'}`}
      >
        Inicio
      </button>

      {userRole === 'admin' && (
        <>
          <div className={`relative group ${isMobile ? 'block' : 'hidden md:block'}`}>
            <button className="px-4 py-2 rounded-full text-gray-300 hover:bg-gray-700 transition duration-300 focus:outline-none w-full text-left">
              Registros {isMobile ? '' : <span className="ml-1 text-xs">▼</span>}
            </button>
            <div className={`
              ${isMobile ? 'relative mt-0.5 ml-4 bg-gray-800 rounded-lg py-1' : 'absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible transform scale-95 group-hover:scale-100 border border-gray-700'}
            `}>
              <button onClick={() => handleMenuItemClick('production-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Registrar Producción</button>
              <button onClick={() => handleMenuItemClick('input-application-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Aplicación Insumos</button>
              <button onClick={() => handleMenuItemClick('labor-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Registrar Labor</button>
              <button onClick={() => handleMenuItemClick('report-disease-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Reportar Enfermedad</button>
              
            </div>
          </div>

          <div className={`relative group ${isMobile ? 'block' : 'hidden md:block'}`}>
            <button className="px-4 py-2 rounded-full text-gray-300 hover:bg-gray-700 transition duration-300 focus:outline-none w-full text-left">
              Planificación {isMobile ? '' : <span className="ml-1 text-xs">▼</span>}
            </button>
            <div className={`
              ${isMobile ? 'relative mt-0.5 ml-4 bg-gray-800 rounded-lg py-1' : 'absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible transform scale-95 group-hover:scale-100 border border-gray-700'}
            `}>
              <button onClick={() => handleMenuItemClick('task-assignment-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Asignar Tarea</button>
            </div>
          </div>

          <div className={`relative group ${isMobile ? 'block' : 'hidden md:block'}`}>
            <button className="px-4 py-2 rounded-full text-gray-300 hover:bg-gray-700 transition duration-300 focus:outline-none w-full text-left">
              Administración {isMobile ? '' : <span className="ml-1 text-xs">▼</span>}
            </button>
            <div className={`
              ${isMobile ? 'relative mt-0.5 ml-4 bg-gray-800 rounded-lg py-1' : 'absolute left-0 mt-2 w-52 bg-gray-800 rounded-lg shadow-xl py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible transform scale-95 group-hover:scale-100 border border-gray-700'}
            `}>
              <button onClick={() => handleMenuItemClick('admin-inputs')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Catálogo Insumos</button>
              <button onClick={() => handleMenuItemClick('admin-products')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Catálogo Productos</button>
              <button onClick={() => handleMenuItemClick('admin-labor-types')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Tipos de Labores</button>
              <button onClick={() => handleMenuItemClick('admin-diseases')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Catálogo Enfermedades</button>
              <button onClick={() => handleMenuItemClick('admin-nutrient-recipes')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Recetas Nutrientes</button>
              <button onClick={() => handleMenuItemClick('admin-locations')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Gestión Ubicaciones</button>
              <button onClick={() => handleMenuItemClick('admin-users')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Gestión Usuarios</button>
              <button onClick={() => handleMenuItemClick('reports-dashboard')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Reportes</button>
              <button onClick={() => handleMenuItemClick('admin-units')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Gestión Unidades</button>
              <button onClick={() => handleMenuItemClick('admin-input-types')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Tipos de Insumo</button>
            </div>
          </div>

          <div className={`relative group ${isMobile ? 'block' : 'hidden md:block'}`}>
            <button className="px-4 py-2 rounded-full text-gray-300 hover:bg-gray-700 transition duration-300 focus:outline-none w-full text-left">
              Ayuda {isMobile ? '' : <span className="ml-1 text-xs">▼</span>}
            </button>
            <div className={`
              ${isMobile ? 'relative mt-0.5 ml-4 bg-gray-800 rounded-lg py-1' : 'absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible transform scale-95 group-hover:scale-100 border border-gray-700'}
            `}>
              <button onClick={() => handleMenuItemClick('nutrient-calculator')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Calc. Mezcla Nutrientes</button>
            </div>
          </div>
        </>
      )}
      {userRole === 'basic' && (
        <>
          <button
            onClick={() => handleMenuItemClick('my-activities')}
            className={`ml-2 px-4 py-2 rounded-full transition duration-300 ${currentPage === 'my-activities' ? 'bg-emerald-700 text-white font-semibold shadow-md' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Mis Actividades
          </button>
          <div className={`relative group ${isMobile ? 'block' : 'hidden md:block'}`}>
            <button className="px-4 py-2 rounded-full text-gray-300 hover:bg-gray-700 transition duration-300 focus:outline-none w-full text-left">
              Registros Rápidos {isMobile ? '' : <span className="ml-1 text-xs">▼</span>}
            </button>
            <div className={`
              ${isMobile ? 'relative mt-0.5 ml-4 bg-gray-800 rounded-lg py-1' : 'absolute left-0 mt-2 w-52 bg-gray-800 rounded-lg shadow-xl py-1 z-20 opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible transform scale-95 group-hover:scale-100 border border-gray-700'}
            `}>
              <button onClick={() => handleMenuItemClick('production-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Registrar Producción</button>
              <button onClick={() => handleMenuItemClick('input-application-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Aplicación Insumos</button>
              <button onClick={() => handleMenuItemClick('labor-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Registrar Labor</button>
              <button onClick={() => handleMenuItemClick('report-disease-form')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Reportar Enfermedad</button>
               <button onClick={() => handleMenuItemClick('nutrient-calculator')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-emerald-800 hover:text-white rounded-lg">Calc. Mezcla Nutrientes</button>
            </div>
          </div>
        </>
      )}
         </>
  );

  // This is the function that returns the main content structure
  const renderContent = () => {
    if (!isAuthReady) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-100">
          <p className="text-xl">Cargando autenticación...</p>
        </div>
      );
    }

    if (!userId) {
      // User is not authenticated, show login form
      return (
        <>
          <NotificationCenter />
          <LoginForm />
        </>
      );
    }

    // User is authenticated, show the main application
    return (
      <div className="min-h-screen flex flex-col bg-gray-900 font-inter text-gray-100">
        {/* Header for mobile (hamburger menu) */}
        <header className="bg-gray-800 shadow-lg p-4 flex justify-between items-center z-20 sticky top-0 md:hidden rounded-b-xl">
          <h1 className="text-2xl font-bold text-emerald-400">🍓 Frescales</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-300 focus:outline-none">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-40 flex flex-col p-4 md:hidden animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-emerald-400">Menú</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 focus:outline-none">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <nav className="flex flex-col space-y-4 text-lg">
              {renderNavLinks(true)} {/* Render links for mobile */}
              <button
                onClick={handleLogout}
                className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 w-full text-left"
              >
                Cerrar Sesión
              </button>
              <span className="text-sm text-gray-400 mt-4">ID Usuario: <span className="font-mono text-gray-200">{userId}</span></span>
            </nav>
          </div>
        )}

        {/* Desktop Header and Sidebar */}
        <div className="flex flex-1">
          <nav className="hidden md:flex flex-col bg-gray-800 shadow-xl p-4 space-y-2 w-64 flex-shrink-0 z-30 rounded-r-xl">
            <div className="flex items-center mb-6">
              <h1 className="text-2xl font-bold text-emerald-400">🍓 Frescales</h1>
            </div>
            {renderNavLinks()} {/* Render links for desktop */}
            <div className="mt-auto pt-6"> {/* Push logout to bottom */}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 w-full text-left"
              >
                Cerrar Sesión
              </button>
              <span className="block mt-4 text-sm text-gray-400">ID Usuario: <span className="font-mono text-gray-200">{userId}</span></span>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-grow p-4 bg-gray-900 md:ml-0"> {/* Main content bg */}
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
              <NotificationCenter />
              {currentPage === 'dashboard' && (
                <div className="p-6 text-center">
                  <h2 className="text-3xl font-semibold text-emerald-300 mb-4">Dashboard Principal</h2>
                  <p className="text-gray-300">Bienvenido al sistema de gestión de Frescales.</p>
                  {userRole === 'admin' && (
                    <p className="text-gray-300 font-medium mt-2">Tienes acceso como <span className="text-emerald-400">Administrador</span>.</p>
                  )}
                  {userRole === 'basic' && (
                    <p className="text-gray-300 font-medium mt-2">Tienes acceso como <span className="text-blue-400">Operario</span>.</p>
                  )}
                  <p className="text-gray-400 text-sm mt-4">
                    Selecciona una opción del menú de navegación para comenzar.
                  </p>
                </div>
              )}

              {currentPage === 'admin-inputs' && <InputCatalog />}
              {currentPage === 'admin-products' && <ProductCatalog />}
              {currentPage === 'admin-labor-types' && <LaborTypeCatalog />}
              {currentPage === 'admin-units' && <UnitCatalog />}
              {currentPage === 'admin-input-types' && <InputTypeCatalog />}
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
        </div>

        <footer className="bg-gray-900 text-gray-400 text-center p-4 border-t border-gray-700">
          <p>&copy; {new Date().getFullYear()} Frescales. Todos los derechos reservados.</p>
        </footer>
      </div>
    );
  };
  // The App component itself needs to return something.
  // This is where the AppContext.Provider should be.
  return (
    <AppContext.Provider value={{ db, auth, userId, userRole, isAuthReady, addNotification, dismissNotification, notifications }}>
      {renderContent()}
    </AppContext.Provider>
  );
}

export default App;